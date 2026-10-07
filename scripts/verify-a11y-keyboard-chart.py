# Keyboard-only build of the 3.2.8 chart + a11y probes. Usage: ORDER_JSON=<list of lesson ids in order> AXE_JS=<axe.min.js> python3 scripts/verify-a11y-keyboard-chart.py [width]
# Needs the student dev server: DEV_ROLE=student PORT=3002 node server.js
import json
import os; ORDER=json.load(open(os.environ['ORDER_JSON']))
AXE=os.environ.get('AXE_JS','')
B='http://localhost:3002'
def start(p, w=1280, h=900):
    br=p.chromium.launch()
    ctx=br.new_context(viewport={'width':w,'height':h})
    ctx.add_cookies([{'name':'dev_student','value':'a11y'+str(__import__('time').time_ns()),'url':B}])
    pg=ctx.new_page()
    pg.goto(B+'/lesson/3-2-8-chart-parameter-trace/')
    pg.evaluate("""async (order)=>{for(const id of order){await fetch('/api/lesson-state/'+id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:'completed'})});}}""", ORDER)
    return br,pg
def axe(pg, sel=None):
    pg.add_script_tag(path=AXE)
    r=pg.evaluate("async()=>{const r=await axe.run(document,{resultTypes:['violations']});return r.violations.map(v=>({id:v.id,impact:v.impact,n:v.nodes.map(n=>n.target.join(' ').slice(0,90))}))}")
    return r

import sys
import sys
from playwright.sync_api import sync_playwright
def focused(pg): return pg.evaluate("(()=>{const e=document.activeElement;return e.tagName+'|'+(e.getAttribute('aria-label')||e.id||'').toString().slice(0,40)+'|'+(e.innerText||'').slice(0,30).replace(/\\n/g,' ')})()")
def tab_to(pg, pred, maxn=120, key='Tab'):
    for i in range(maxn):
        pg.keyboard.press(key)
        if pred(): return i
    raise Exception('not found; at '+focused(pg))
W=int(sys.argv[1]) if len(sys.argv)>1 else 1280
with sync_playwright() as p:
    br,pg=start(p,W)
    pg.goto(B+'/lesson/3-2-8-chart-parameter-trace/'); pg.wait_for_timeout(3500)
    status=lambda: pg.locator('[role=status].sr-only').first.inner_text()
    # Reach the palette by keyboard from the page's Add: label via the clear button's neighbour
    pg.locator('button[aria-label="Add Start / End shape"]').focus()
    adds=[('Add Task shape','Set base to 100'),('+more',None),('Add Function call shape','showPriceWithTax of base'),('Add Decision shape','Is base over 80?'),('Add Input / Output shape','Print Over budget'),('Add Input / Output shape','Print Within budget')]
    for a,txt in adds:
        if a=='+more':
            
            if pg.locator('button[aria-label^="Add Function call"]').count()==0:
                pg.get_by_role('button',name='+ more shapes').focus(); pg.keyboard.press('Enter')
            continue
        pg.locator(f'button[aria-label="{a}"]').focus(); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
        print('focus after add:',focused(pg).split('|')[0],'| status:',status())
        pg.keyboard.type(txt); pg.keyboard.press('Enter'); pg.wait_for_timeout(250)
        print('  focus after Enter:',focused(pg))
    nodes=pg.evaluate("[...document.querySelectorAll('.react-flow__node')].map(n=>n.innerText.replace(/\\n/g,' '))"); print(nodes)
    edges=[('Start','Set base to 100'),('Set base to 100','showPriceWithTax of base'),('showPriceWithTax of base','Is base over 80?'),('Is base over 80?','Print Over budget'),('Is base over 80?','Print Within budget'),('Print Over budget','End'),('Print Within budget','End')]
    def cur_node_text(): return pg.evaluate("(document.activeElement.classList.contains('react-flow__node')?document.activeElement.innerText:'').replace(/\\n/g,' ').trim()")
    for src,dst in edges:
        # keyboard: from the palette, Tab forward until the source node has focus
        pg.locator('button[aria-label="Add Task shape"]').focus()
        tab_to(pg, lambda: cur_node_text()==src)
        pg.keyboard.press('Enter'); pg.wait_for_timeout(150)
        sel=pg.locator('#flow-connect-to')
        assert sel.count()==1, 'no connect select for '+src
        tab_to(pg, lambda: pg.evaluate("document.activeElement.id")=='flow-connect-to')
        opts=sel.locator('option').all_inner_texts()
        idx=[i for i,o in enumerate(opts) if o.split(': ',1)[-1]==dst][0]
        for _ in range(idx): pg.keyboard.press('ArrowDown')
        pg.keyboard.press('Tab'); pg.keyboard.press('Enter')
        pg.wait_for_timeout(250)
        print(src,'->',dst,'|',status())
    print('edges:',pg.evaluate("[...document.querySelectorAll('.react-flow__edge')].length"))
    print('edge labels:',pg.evaluate("[...document.querySelectorAll('.react-flow__edge-textwrapper, .react-flow__edge text')].map(t=>t.textContent)"))
    pg.screenshot(path=f'kb_{W}.png')
    # Check
    pg.get_by_role('button',name=__import__('re').compile('Check my diagram',2)).focus(); pg.keyboard.press('Enter'); pg.wait_for_timeout(2500)
    pg.screenshot(path=f'kb_check_{W}.png')
    print(pg.evaluate("document.body.innerText.match(/[^\\n]*\\d+ ?\\/ ?\\d+[^\\n]*/g)"))
    print('scroll',pg.evaluate("[document.documentElement.scrollWidth,innerWidth]"))
    if AXE: print('axe:', [(v['id'], v['n'][:3]) for v in axe(pg)])
    br.close()
