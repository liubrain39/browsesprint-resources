export const cases=[
 {site:'iana',url:'https://www.iana.org/help/example-domains',title:'Example Domains',checks:['documentation purposes','registration or transfer']},
 {site:'cern',url:'https://info.cern.ch/hypertext/WWW/TheProject.html',title:'World Wide Web',checks:['hypermedia','Getting code']},
 {site:'berkshire',url:'https://www.berkshirehathaway.com/',title:'BERKSHIRE HATHAWAY',checks:['Annual','Corporate Governance']},
 {site:'w3c',url:'https://www.w3.org/Provider/Style/URI.html',title:'Cool URIs',checks:['domain name','forethought']},
 {site:'govuk-visa',url:'https://www.gov.uk/check-uk-visa',title:'Check if you need a UK visa',checks:['visa','nationality']},
 {site:'apple-mac',url:'https://www.apple.com/mac/',title:'Mac',checks:['MacBook','Mac mini']},
 {site:'nhs',url:'https://www.nhs.uk/live-well/exercise/walking-for-health/',title:'Walking',checks:['150 minutes','3 miles an hour','Ramblers']},
 {site:'stanford-about',url:'https://www.stanford.edu/about/',title:'About Stanford',checks:['The Spirit of the West','seven schools']},
];
export const relayEndpoint='https://reader.codexbrowse.site/api/read';
export function contentChecks(c,result){
 const norm=x=>String(x||'').replace(/\s+/g,' ').toLowerCase();
 const text=norm([result?.text,...(result?.tables||[]).flat(2)].join(' '));
 return {title:norm(result?.title).includes(norm(c.title)),phrases:c.checks.map(phrase=>({phrase,ok:text.includes(norm(phrase))}))};
}
