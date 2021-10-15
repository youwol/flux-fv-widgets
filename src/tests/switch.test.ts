import { instantiateModules, ModuleDataEmitter, parseGraph, renderTemplate, Runner } from "@youwol/flux-core"
import { take } from "rxjs/operators"
import { ModuleSwitch } from "../index"

console.log = () => { }

test('ModuleSwitch', (done) => {

    document.body.innerHTML = ""
    let branches = [
        '|~switch~|---'
    ]

    let modules = instantiateModules({
        switch: ModuleSwitch,
    })

    let graph = parseGraph({ branches, modules })

    new Runner(graph)

    let div = document.createElement('div')
    div.innerHTML = '<div id="switch"></div>'
    document.body.appendChild(div)
    renderTemplate(div, Object.values(modules))

    let switchView = document.querySelector('.fv-switch')
    expect(switchView).toBeTruthy()

    // EXPECT default configuration is 'checked==true'
    modules.switch.outputSlots[0].observable$.pipe(
        take(1)
    ).subscribe(({ data }) => {
        expect(data).toBeTruthy()
    })

    // WHEN user click on the switch
    switchView.dispatchEvent(new Event('click', { bubbles: true }))

    // EXPECT output 'false' is sent
    modules.switch.outputSlots[0].observable$.pipe(
        take(1)
    ).subscribe(({ data }) => {
        expect(data).toBeFalsy()
        done()
    })
})


test('ModuleSwitch with incoming data', (done) => {

    document.body.innerHTML = ""
    let branches = [
        '|~dataEmitter~|-----|~switch~|---'
    ]

    let modules = instantiateModules({
        dataEmitter: ModuleDataEmitter,
        switch: ModuleSwitch,
    })

    let graph = parseGraph({ branches, modules })

    new Runner(graph)

    let div = document.createElement('div')
    div.innerHTML = '<div id="switch"></div>'
    document.body.appendChild(div)
    renderTemplate(div, Object.values(modules))

    // WHEN configuration is overridden with 'checked==false'    
    modules.dataEmitter.emit({ configuration: { checked: false } })

    // THEN the module emits a value 'false'
    modules.switch.outputSlots[0].observable$.pipe(
        take(1)
    ).subscribe(({ data }) => {
        expect(data).toBeFalsy()
        done()
    })
})

