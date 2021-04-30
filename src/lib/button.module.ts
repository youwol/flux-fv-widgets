import {
    BuilderView, Flux, Property, RenderView, Schema, ModuleFlux, Pipe
} from '@youwol/flux-core'
import { HTMLElement$, render } from "@youwol/flux-view"
import { Button } from '@youwol/fv-button'
import { pack } from './main'

/**
 ## Presentation

   A simple button, emits an Event when clicked

## Resources

Various resources:
-    [fv-button](https://github.com/youwol/fv-button):
the library that provides the underlying implementation
*/
export namespace ModuleButton {

    let svgIcon = `<path d="M512,59.749H0v226.935h171.27l35.647,133.037l46.413-72.203l104.734,104.734l66.737-66.737l-98.829-98.829H512V59.749z     M377.579,385.514l-19.515,19.515L247.644,294.611l-28.008,43.57l-33.342-124.435l124.435,33.342l-43.57,28.007L377.579,385.514z     M478.609,253.294H362.828l29.442-18.926l-253.197-67.844l23.25,86.771H33.391V93.14h445.217V253.294z" ></path>`

    /**
     * ## Persistent Data  🔧
     *
     * Persisted properties of the module are the attributes of this object.
     */
    @Schema({
        pack
    })
    export class PersistentData {

        @Property({ description: "text on the widget" })
        text: string

        constructor({ text }: { text?: string } = {}) {
            this.text = (text != undefined) ? text : "click me :)"
        }
    }

    type TOutput = { value: number, event: MouseEvent, dragging: boolean }

    /** ## Module
     *
     * See [[ModuleButton]] for a presentation of the module
     */
    @Flux({
        pack: pack,
        namespace: ModuleButton,
        id: "ModuleButton",
        displayName: "Button",
        description: "A button to trigger branches of the data flow from clicks.",
        resources: {
            'technical doc': `${pack.urlCDN}/dist/docs/modules/lib_button_module.modulebutton.html`
        }
    })
    @BuilderView({
        namespace: ModuleButton,
        icon: svgIcon
    })
    @RenderView({
        namespace: ModuleButton,
        render: (mdle: Module) => renderHtmlElement(mdle)
    })
    export class Module extends ModuleFlux {

        readonly output$: Pipe<MouseEvent>

        constructor(params) {
            super(params)
            this.output$ = this.addOutput({ id: "output" })
        }

        emitClick(event: MouseEvent) {
            this.output$.next({ data: event })
        }
    }


    export function renderHtmlElement(mdle: Module): HTMLElement {

        let state = new Button.State()
        let view = new Button.View({
            state, 
            contentView: () => ({innerText: mdle.getPersistentData<PersistentData>().text}),
            connectedCallback : (elem: HTMLElement$) => {
                let s = state.click$.subscribe( (ev) => {
                    mdle.emitClick(ev)
                })
                elem.ownSubscriptions(s)
            } 
        } as any)
        return render(view)
    }
}