import { instantiateModules, ModuleDataEmitter, parseGraph, renderTemplate, Runner } from "@youwol/flux-core"
import { take } from "rxjs/operators"
import { ModuleSlider } from "../index"

console.log = () => {}

test('ModuleSlider, no emit on drag', (done) => {

    document.body.innerHTML = ""
    let branches = [
        '|~slider~|---'
    ]
    
    let modules = instantiateModules({
        slider:      ModuleSlider,
    })
    
    let graph       = parseGraph( { branches, modules }  )

    new Runner( graph ) 

    let div = document.createElement('div') 
    div.innerHTML = '<div id="slider"></div>'
    document.body.appendChild(div)
    renderTemplate(div, Object.values(modules))

    let input = document.querySelector('input')
    expect(input).toBeDefined()

    expect(parseFloat(input.min)).toEqual(modules.slider.getPersistentData()['min'])
    expect(parseFloat(input.max)).toEqual(modules.slider.getPersistentData()['max'])
    
    modules.slider.outputSlots[0].observable$.pipe(
        take(1)
    ).subscribe( ({data}) => {
        expect(data.dragging).toBeFalsy()
        expect(data.event).toBeInstanceOf(MouseEvent)
        expect(data.value).toEqual(0.5)
    })

    input.onchange({target:{value:0.7}} as any)   
    
    modules.slider.outputSlots[0].observable$.pipe(
        take(1)
    ).subscribe( ({data}) => {
        expect(data.dragging).toBeFalsy()
        expect(data.value).toEqual(0.7)
    })

    input.oninput({target:{value:0.2}} as any)   
    // emit on drag is not activated => we should get the previous event
    modules.slider.outputSlots[0].observable$.pipe(
        take(1)
    ).subscribe( ({data}) => {
        expect(data.dragging).toBeFalsy()
        expect(data.value).toEqual(0.7)
        done()
    })
})


test('ModuleSlider, with emit on drag', (done) => {

    document.body.innerHTML = ""
    let branches = [
        '|~slider~|---'
    ]
    
    let modules = instantiateModules({
        slider:      [ModuleSlider, {emitOnDrag:true}],
    })
    
    let graph       = parseGraph( { branches, modules }  )

    new Runner( graph ) 

    let div = document.createElement('div') 
    div.innerHTML = '<div id="slider"></div>'
    document.body.appendChild(div)
    renderTemplate(div, Object.values(modules))

    let input = document.querySelector('input')
    input.onchange({target:{value:0.7}} as any)   
    
    modules.slider.outputSlots[0].observable$.pipe(
        take(1)
    ).subscribe( ({data}) => {
        expect(data.dragging).toBeFalsy()
        expect(data.value).toEqual(0.7)
    })

    input.oninput({target:{value:0.2}} as any)   
    // emit on drag is activated => we should get the previous event
    modules.slider.outputSlots[0].observable$.pipe(
        take(1)
    ).subscribe( ({data}) => {
        expect(data.dragging).toBeTruthy()
        expect(data.value).toEqual(0.2)
        done()
    })
})

test('ModuleSlider override conf', (done) => {

    document.body.innerHTML = ""
    let branches = [
        '|~dataEmitter~|-----|~slider~|---'
    ]
    
    let modules = instantiateModules({
        dataEmitter: ModuleDataEmitter,
        slider:      ModuleSlider,
    })
    
    let graph       = parseGraph( { branches, modules }  )

    new Runner( graph ) 

    let div = document.createElement('div') 
    div.innerHTML = '<div id="slider"></div>'
    document.body.appendChild(div)
    renderTemplate(div, Object.values(modules))

    let input = document.querySelector('input')
    expect(input).toBeDefined()

    expect(parseFloat(input.min)).toEqual(modules.slider.getPersistentData()['min'])
    expect(parseFloat(input.max)).toEqual(modules.slider.getPersistentData()['max'])
    
    modules.dataEmitter.emit({configuration:{value:5, max:10}})    

    expect(parseFloat(input.max)).toEqual(10)

    modules.slider.outputSlots[0].observable$.pipe(
        take(1)
    ).subscribe( ({data}) => {
        expect(data.value).toEqual(5)
        done()
    })
    
})

