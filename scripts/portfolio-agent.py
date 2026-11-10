"""Direct content API: no Lovable tool, build, or service_role required.
Credentials live outside the repository in a mode-0600 file.
Usage: python scripts/portfolio-agent.py context|import|publish|courses|course-import|course-document [package.json]
"""
import json,os,sys,subprocess
from pathlib import Path

def request(operation,package_path=None):
 credentials=Path(os.environ.get('PORTFOLIO_AGENT_CREDENTIALS','/workspace/.portfolio-agent/teacher-portfolio.json'))
 if credentials.stat().st_mode & 0o077: raise RuntimeError('Credential file must have mode 0600')
 cfg=json.loads(credentials.read_text())
 routes={'context':'portfolio_agent_context','import':'portfolio_import','publish':'portfolio_agent_publish','courses':'portfolio_courses_view','course-import':'portfolio_course_import','course-document':'portfolio_course_document'}
 if operation not in routes:raise ValueError('Unknown agent operation')
 body={'p_key':cfg['integration_key']}
 if operation=='courses':body['p_owner']=True
 elif operation=='course-document':body['p_id']=json.loads(Path(package_path).read_text())['id']
 elif operation!='context':body['p_package']=json.loads(Path(package_path).read_text())
 url=cfg['url'].rstrip('/')+'/rest/v1/rpc/'+routes[operation]
 # curl uses the session proxy and CA trust; secrets are supplied over stdin only.
 config='url = '+json.dumps(url)+'\nheader = '+json.dumps('apikey: '+cfg['publishable_key'])+'\nheader = "Content-Type: application/json"\nrequest = "POST"\ndata = '+json.dumps(json.dumps(body,ensure_ascii=False),ensure_ascii=False)+'\n'
 result=subprocess.run(['curl','--silent','--show-error','--fail-with-body','--max-time','90','--config','-'],input=config,capture_output=True,text=True)
 if result.returncode: raise RuntimeError('Content API request failed: '+result.stdout[:300]+result.stderr[:200])
 return json.loads(result.stdout)
if __name__=='__main__':
 if len(sys.argv)<2:raise SystemExit(__doc__)
 print(json.dumps(request(sys.argv[1],sys.argv[2] if len(sys.argv)>2 else None),ensure_ascii=False))
