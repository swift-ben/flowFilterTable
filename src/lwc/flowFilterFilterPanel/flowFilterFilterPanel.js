/**
 * Created by bswif on 12/27/2022.
 */

import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class FlowFilterFilterPanel extends LightningElement {
    @api fldList;//array of fields passed from flowFilterCMP
    @api _fldList;//local array of fields with filters

    //run on load
    connectedCallback(){
        try{
            this._fldList = [];
            for(let fld of this.fldList){
                this._fldList.push(Object.assign({},fld))
            }
        }catch(e){
            this.logErr(e,'error on callback');
        }
    }

    //catch update to filters from flowFilterFilter
    handleFilterUpdate(event){
        try{
            for(let attr in event.detail.fld){
                this._fldList.find(fld => {return fld.fldName == event.detail.fld.fldName})[attr] = event.detail.fld[attr];
            }
            this.fldList = this._fldList;
            const evt = new CustomEvent('filtersupdate',{
                detail:{
                    fldList: this.fldList
                }
            });
            this.dispatchEvent(evt);
        }catch(e){
            this.logErr(e,'error on handleFilterUpdate');
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