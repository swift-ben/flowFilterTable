/**
 * Created by bswif on 12/27/2022.
 */

import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class FlowFilterFilter extends LightningElement {
    @api fld;//fld sent from flowFilterFilterPanel
    @api _fld;//fld to send back to flowFilterFilterPanel with filters
    @track selectedPicklistVals = [];//selected values returned from combobox
    @track boolOpts = [//option list for booleans
        {
            label: null,
            value: null
        }
        ,
        {
            label: "Checked",
            value: "Checked"
        },
        {
            label: "Unchecked",
            value: "Unchecked"
        }
    ];

    //get methods for conditional filter displays
    get isText(){
        let textTypes = ['email','phone','text','url'];
        return textTypes.includes(this.fld.fldType);
    }

    get isPicklist(){
        return this.fld.fldType == 'picklist';
    }

    get isDecimal(){
        let decTypes = ['percent','number','currency'];
        return decTypes.includes(this.fld.fldType);
    }

    get isBoolean(){
        return this.fld.fldType == 'boolean';
    }

    get isDate(){
        return this.fld.fldType == 'date-local';
    }

    //labels for min and max ranges DEPRECATED
    get minLabel(){
        return this.fld.dispLabel + ' From'
    }

    get maxLabel(){
        return this.fld.dispLabel + ' To'
    }

    //run on load
    connectedCallback(){
        try{
            let filterAttrs = ['containsText','selectVals','rangeMax','rangeMin','dateMax','dateMin','bool','ref'];
            this._fld = Object.assign({},this.fld);
            for(let theAttr of filterAttrs){
                this._fld[theAttr] = (this._fld[theAttr])? this._fld[Attr] : null;
            }
        }catch(e){
            this.logErr(e,'error on callback');
        }
    }

    //function to update filter and send to parent lwc
    handleUpdateFilter(event){
        try{
            this._fld[event.target.name] = event.target.value;
            this.filterUpdate();
        }catch(e){
            this.logErr(e,'error on handleUpdateFilter');
        }
    }

    //function to handle update from combobox lwcs
    handleComboboxUpdate(event){
        try{
            this._fld.selectVals = event.detail.payload.values.join(';');
            this.filterUpdate();
        }catch(e){
            this.logErr(e,'error on handleComboboxUpdate');
        }
    }

    //function to send filter update to flowFilterFilterPanel
    filterUpdate(){
        try{
            this.fld = this._fld;
            const evt = new CustomEvent('filterupdate',{
                detail:{
                    fld: this.fld
                }
            });
            this.dispatchEvent(evt);
        }catch(e){
            this.logErr(e,'error on filterUpdate');
        }

    }

    //log an error
    logErr(error,logMsg){
        console.log('caught err');
        console.log(logMsg);
        console.log(error.message);
        console.log(error);
        let errMsg = `Something went wrong. Error: \n\n ${logMsg} \n\n ${error.message}`;
        this.showTst('Error',errMsg,'error','sticky');
    }

    //show a message
    showTst(t,m,v,md){
        const event = new ShowToastEvent({
            title: t,
            message: m,
            variant: v,
            mode: md
        });
        this.dispatchEvent(event);
    }
}