import { generateAIResponse, FREE_MODELS } from './openrouter';

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID!;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET!;
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI!;

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    console.warn("LinkedIn Env Vars missing!");
}

export const getAuthUrl = () => {
    // DEFAULT: Basic Member Access (No Company Page)
    // This allows login + personal profile posting.
    // We do NOT ask for w_organization_social by default because it breaks if the app doesn't have the "Marketing Developer Platform" product.
    // Users must be approved for that product to use the Company Page features.
    const scope = 'openid profile email w_member_social';

    return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scope)}`;
};

export const getOrganizationAuthUrl = () => {
    // Separate URL for users who specifically want to enable Company Page features and KNOW they have the product enabled.
    const scope = 'openid profile email w_member_social w_organization_social';
    return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scope)}`;
};
export const getAccessToken = async (code: string) => {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('redirect_uri', REDIRECT_URI);

    const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
    });

    if (!res.ok) {
        throw new Error(await res.text());
    }

    return await res.json();
};

export const getUserProfile = async (accessToken: string) => {
    // Try OIDC endpoint first (if openid scope was granted)
    try {
        const oidcRes = await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (oidcRes.ok) {
            return await oidcRes.json();
        }
    } catch (e) {
        // ignore
    }

    // Fallback to legacy v2/me for r_liteprofile
    const res = await fetch('https://api.linkedin.com/v2/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!res.ok) {
        throw new Error('Failed to fetch user profile');
    }

    const data = await res.json();
    return {
        sub: data.id, // Map legacy 'id' to OIDC 'sub' for consistency
        ...data
    };
};

export const getOrganizations = async (accessToken: string) => {
    const res = await fetch('https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const data = await res.json();
    return data;
};

export const createLinkedInPost = async (accessToken: string, text: string, link?: string, authorUrn?: string) => {
    // If no author provided, use the user's profile
    if (!authorUrn) {
        const userInfo = await getUserProfile(accessToken);
        authorUrn = `urn:li:person:${userInfo.sub}`;
    }

    const body: any = {
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
            'com.linkedin.ugc.ShareContent': {
                shareCommentary: {
                    text: text
                },
                shareMediaCategory: 'NONE'
            }
        },
        visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
    };

    if (link) {
        body.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'ARTICLE';
        body.specificContent['com.linkedin.ugc.ShareContent'].media = [
            {
                status: 'READY',
                description: { text: 'Learn more' },
                originalUrl: link,
                title: { text: 'Check this out' }
            }
        ];
    }

    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
        },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        throw new Error(await res.text());
    }

    return await res.json();
};

export const generateLinkedInContent = async () => {
    const messages = [
        {
            role: 'system' as const,
            content: `You are a social media manager for Levitate Labs (a premium digital agency). 
            Generate a comprehensive, professional LinkedIn post about **LATEST Tech Developments** (e.g., AI Agents, WebAssembly, Edge Computing, Rust in Web, etc.). 
            NO EMOJIS. ABSOLUTELY NO EMOJIS.
            Tone: Professional, Insightful, authoritative.
            Focus: Business impact of new tech.
            Keep it under 300 words.
            Hashtags: #LevitateLabs #TechInnovation #DigitalTransformation`
        },
        {
            role: 'user' as const,
            content: 'Generate a new tech insight post for today.'
        }
    ];

    return await generateAIResponse(messages, FREE_MODELS.GEMINI_FLASH_2);
};
