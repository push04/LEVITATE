'use client';

import { motion } from 'framer-motion';

interface TeamMember {
  name: string;
  role: string;
  bio: string;
  initials: string;
}

const team: TeamMember[] = [
  { name: 'Rahul Sharma', role: 'Founder & CEO', bio: 'Building AI for Indian SMBs', initials: 'RS' },
  { name: 'Priya Patel', role: 'Head of Growth', bio: 'Scaling automation across Gujarat', initials: 'PP' },
  { name: 'Amit Singh', role: 'Lead Engineer', bio: 'Architecting the agent system', initials: 'AS' },
];

function getColorFromName(name: string): string {
  const colors = ['#C8A96E', '#2563eb', '#10b981', '#dc2626', '#7c3aed'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function Team() {
  return (
    <section className="py-16 md:py-32 bg-[var(--background)]">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 md:px-12">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-headline text-4xl md:text-9xl text-[var(--foreground)] mb-12"
        >
          Our Team
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {team.map((member, i) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 bg-white/5 rounded-lg text-center"
            >
              <div
                className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-white font-bold text-xl"
                style={{ backgroundColor: getColorFromName(member.name) }}
              >
                {member.initials}
              </div>
              <h3 className="text-[var(--foreground)] font-semibold">{member.name}</h3>
              <p className="text-[#C8A96E] text-sm mt-1">{member.role}</p>
              <p className="text-[var(--muted)] text-sm mt-3">{member.bio}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
