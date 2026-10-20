// Avoid printing private source excerpts from an uncaught stack trace.
try{await import('./.runner-private/runner.mjs');}
catch(e){console.error(JSON.stringify({fatal:true,code:e.code||e.name}));process.exitCode=1;}
