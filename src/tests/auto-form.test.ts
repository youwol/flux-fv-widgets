import {
    Flux, FluxPack, freeContract, ModuleFlux, Pipe, Property, Schema, Context, flattenSchemaWithValue
} from "@youwol/flux-core"
import { render } from "@youwol/flux-view"
import { skip, take } from "rxjs/operators"
import { AutoForm } from "../lib/auto-form/auto-form.view"


console.log = () => { }

let pack = new FluxPack({ name: 'test-auto-form', version: '0' })

export enum enumType {
    enum0 = 'enum0',
    enum1 = 'enum1'
}

@Schema({ pack })
export class Nested0 {

    @Property({})
    title: string = "titleNested0"

    @Property({})
    activated: boolean = true

    constructor(params: { title?: string, activated?: boolean } = {}) {
        Object.assign(this, params)
    }
}

@Schema({ pack })
export class Nested1 {

    @Property({})
    value: number = 1


    @Property({ type:'color'})
    color: string = ""

    constructor(params: { value?: number, color?: string } = {}) {
        Object.assign(this, params)
    }
}

@Schema({ pack })
export class BaseClass {

    @Property({
        min: 0,
        max: 1
    })
    valueBase: number = 0.5

    constructor(params: { value?: number } = {}) {
        Object.assign(this, params)
    }
}


@Schema({ pack })
export class PersistentData extends BaseClass {

    @Property({
        enum: Object.values(enumType)
    })
    enumValue: enumType = enumType.enum0

    @Property({
    })
    nested0: Nested0 = new Nested0()

    @Property({
    })
    nested1: Nested1 = new Nested1()


    constructor({ enumValue, nested0, nested1, ...others }: { nested0?: Nested0, nested1?: Nested1, enumValue?: enumType } = {}) {
        super(others)
        if (enumValue)
            this.enumValue = enumValue
        if (nested0)
            this.nested0 = new Nested0(nested0)
        if (nested1)
            this.nested1 = new Nested1(nested1)
    }
}



test('test widgets, all properties exposed', (done) => {
    let data = new PersistentData()
    let schemaWithValue = flattenSchemaWithValue(data)
    Object.keys(schemaWithValue).forEach(k => schemaWithValue[k] = schemaWithValue[k][0])
    let state = new AutoForm.State(
        data,
        schemaWithValue as any
    )

    state.currentValue$.pipe(take(1)).subscribe( ({enumValue, nested0, valueBase}) => {

        expect(enumValue).toEqual(enumType.enum0)
        expect(nested0.title).toEqual('titleNested0')
        expect(nested0.activated).toEqual(true)
        expect(valueBase).toEqual(0.5)
    })

    let view = new AutoForm.View({state})
    let dom = render(view)
    document.body.appendChild(dom)

    let innerHTML = document.body.innerHTML
    let inputs = Array.from(document.body.querySelectorAll(".auto-form-value"))
    
    let titles = inputs.map( (input) => input.getAttribute('title'))
    expect(titles).toEqual(["valueBase", "enumValue", "title", "activated"])

    let activated = document.querySelector(".fv-switch")

    state.currentValue$.pipe(take(1)).subscribe( ({nested0}) => {
        expect(nested0.activated).toEqual(false)
    })

    activated.dispatchEvent(new MouseEvent('click'))
    

    // Quick look at the tabs for nested0 et nested1
    let tabs = Array.from(document.body.querySelectorAll(".auto-form-tab-header"))
    titles = tabs.map( (input) => input.getAttribute('title'))
    expect(titles).toEqual(["nested0", "nested1"])

    let tabNested1 = document.body.querySelector(".auto-form-tab-header.nested1") as HTMLDivElement
    expect(tabNested1.innerText).toEqual('nested1')
    // we change the active tab
    tabNested1.parentElement.dispatchEvent(new MouseEvent('click'))

    inputs = Array.from(document.body.querySelectorAll(".auto-form-value"))
    titles = inputs.map( (input) => input.getAttribute('title'))
    expect(titles).toEqual(["valueBase", "enumValue", "value", "color"])

    done()
})
