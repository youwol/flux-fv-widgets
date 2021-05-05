import { instantiateModules, ModuleDataEmitter, parseGraph, renderTemplate, Runner } from "@youwol/flux-core"
import { take } from "rxjs/operators"
import { ModuleSelect } from "../index"

console.log = () => {}

test('ModuleSelect', (done) => {

    document.body.innerHTML = ""
    let branches = [
        '|~select~|---'
    ]
    
    let modules = instantiateModules({
        select:      ModuleSelect,
    })
    
    let graph       = parseGraph( { branches, modules }  )

    new Runner( graph ) 

    let div = document.createElement('div') 
    div.innerHTML = '<div id="select"></div>'
    document.body.appendChild(div)
    renderTemplate(div, Object.values(modules))

    let options = Array.from(document.querySelectorAll('option'))
    let select = document.querySelector('select')
    expect(options.length).toEqual(2)
    
    modules.select.outputSlots[0].observable$.pipe(
        take(1)
    ).subscribe( ({data}) => {
        expect(data.id).toEqual("option1")
        expect(data.data.n).toEqual(0)
    })
    select.onchange( {target:[{selected:true,value:'option2'}]} as any)

    modules.select.outputSlots[0].observable$.pipe(
        take(1)
    ).subscribe( ({data}) => {
        expect(data.id).toEqual("option2")
        expect(data.data.n).toEqual(1)
        done()
    })
})


test('ModuleSelect override conf selectedId', (done) => {

    document.body.innerHTML = ""
    let branches = [
        '|~dataEmitter~|-----|~select~|---'
    ]
    
    let modules = instantiateModules({
        dataEmitter: ModuleDataEmitter,
        select:      ModuleSelect,
    })
    
    let graph       = parseGraph( { branches, modules }  )

    new Runner( graph ) 

    let div = document.createElement('div') 
    div.innerHTML = '<div id="select"></div>'
    document.body.appendChild(div)
    renderTemplate(div, Object.values(modules))

    let select = document.querySelector('select')
    expect(select).toBeDefined()
    
    modules.dataEmitter.emit({configuration:{ selectedId: 'option2'}})    

    modules.select.outputSlots[0].observable$.pipe(
        take(1)
    ).subscribe( ({data}) => {
        expect(data.id).toEqual("option2")
        expect(data.data.n).toEqual(1)

        modules.select.dispose()
        expect(modules.select.subscription.closed).toBeTruthy()
        done()
    })
})

test('ModuleSelect override conf items', (done) => {

    document.body.innerHTML = ""
    let branches = [
        '|~dataEmitter~|-----|~select~|---'
    ]
    
    let modules = instantiateModules({
        dataEmitter: ModuleDataEmitter,
        select:      ModuleSelect,
    })
    
    let graph       = parseGraph( { branches, modules }  )

    new Runner( graph ) 

    let div = document.createElement('div') 
    div.innerHTML = '<div id="select"></div>'
    document.body.appendChild(div)
    renderTemplate(div, Object.values(modules))

    let select = document.querySelector('select')
    expect(select).toBeDefined()
    
    modules.dataEmitter.emit({configuration:{
        items: [1,2,3].map( i => new ModuleSelect.Item({
            text: `dyn option ${i}`,
            id:`dyn_option${i}`,
            data:{n:i}})),
        selectedId: 'dyn_option3'}})    
    
    let options = Array.from(document.querySelectorAll('option'))
    
    expect(options.length).toEqual(3)
            
    modules.select.outputSlots[0].observable$.pipe(
        take(1)
    ).subscribe( ({data}) => {
        expect(data.id).toEqual("dyn_option3")
        expect(data.data.n).toEqual(3)
        done()
    })
})
