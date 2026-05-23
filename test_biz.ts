import bizdev from './netlify/functions/bizdev.mjs'; // wait, it's .mts

// To use tsx we can import the TS file
import bizdevHandler from './netlify/functions/bizdev.mts';

async function testRealBizDev() {
  console.log('Invoking real Netlify BizDev cron...');
  await bizdevHandler();
  console.log('Done!');
}

testRealBizDev();
