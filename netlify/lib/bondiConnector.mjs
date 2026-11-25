/** Private BondiSupport connector settings. Never expose these values via VITE_. */
export function bondiSettings(){
 const environment=(process.env.CIGUENA_BONDI_ENV||'').trim().toLowerCase();
 if(!['qa','prod'].includes(environment)) throw new Error('invalid_bondi_environment');
 const legacyQa=environment==='qa'?'CIGUENA_BONDI_QA_CONNECTOR_TOKEN':null;
 const token=(process.env.CIGUENA_BONDI_CONNECTOR_TOKEN||
   (legacyQa?process.env[legacyQa]:'')||'').trim();
 const endpoint=(process.env.CIGUENA_BONDI_CONNECTOR_URL||
   (environment==='qa'?'https://bondisupport.netlify.app/.netlify/functions/ciguena-qa-support':'')).trim();
 if(token.length!==64||/[^\x21-\x7e]/.test(token)) throw new Error('invalid_bondi_token');
 let parsed;
 try{parsed=new URL(endpoint);}catch{throw new Error('invalid_bondi_endpoint');}
 if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.search||parsed.hash ||
   !parsed.pathname.endsWith('/.netlify/functions/'+(environment==='qa'?'ciguena-qa-support':'ciguena-support')))
   throw new Error('invalid_bondi_endpoint');
 // Explicit environment check prevents PROD accidentally writing into QA.
 return {token,endpoint:parsed.toString().replace(/\/$/,'')};
}
