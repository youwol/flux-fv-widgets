import { instantiateModules, parseGraph, renderTemplate, Runner } from "@youwol/flux-core"
import { ModuleButton } from "../index"

console.log = () => {}

test('ModuleButton', (done) => {

    let branches = [
        '|~button~|---'
    ]
    
    let modules = instantiateModules({
        button:      ModuleButton,
    })
    
    let graph       = parseGraph( { branches, modules }  )

    new Runner( graph ) 

    let div = document.createElement('div') 
    div.innerHTML = '<div id="button"></div>'
    document.body.appendChild(div)
    renderTemplate(div, Object.values(modules))

    let btn = document.querySelector('button')
    expect(btn).toBeDefined()

    modules.button.outputSlots[0].observable$.subscribe( ({data}) => {
        expect(data).toBeInstanceOf(MouseEvent)
        done()
    })
    btn.dispatchEvent(new MouseEvent('click'))
})

