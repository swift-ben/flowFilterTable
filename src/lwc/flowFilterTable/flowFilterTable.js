/**
 * Created by bswif on 12/27/2022.
 */

import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

/*
    FUUUUUUUUUUUUUUUUCK
    need custom cmpts for lookup and picklist
    https://salesforce.stackexchange.com/questions/271111/how-to-use-custom-lwc-lightning-component-in-lightning-datatable

    TODO
        [x] handle edits
        [x] handle selects
        [] test inline editing on all field types
        [] test no sortable or editable fields
        [x] horizontal scroller
        [] test infinite data
            https://techdicer.com/infinite-lazy-loading-in-lwc-lightning-datatable/
        [] handle load and loadmore (send to parent to disable next)
            https://techdicer.com/infinite-lazy-loading-in-lwc-lightning-datatable/
        [x] try catch return data
        [x] test clearing filter
        [x] case insensitive text filtering
        [x] date range filtering
        [x] run filter after edit
        [x] run sort after filter
        [x] unfiltering clears selection
            [] live test
        [x] editing clears selection
            [] live test
        [] comment out some of the larger functions
*/
export default class FlowFilterTable extends LightningElement {
    @api recList;//list of records passed from flowFilterCMP
    selectedRecList;//list of selected records to pass to flowFilterCMP
    updatedRecIds;//array of updated Record Ids
    currentFilters;//current filters passed from flowFilterCMP
    @track filteredRecList;//currently filtered records
    @api fldList;//list of fields with current filters sent from flowFilterCMP
    @api allowSelect;//display select option on rows
    @api returnUpdatedRecs;//return only updated Records vs all Records
    @track colList;//list of columns for data table
    defaultSortDirection = 'asc';
    sortDirection = 'asc';
    sortedBy;

    //return hide checkbox attribute
    get hideCheckBox(){
        return !(this.allowSelect);
    }


    //function to maintain selected rows through filter and inline edit
    get selectedRowIds(){
        let idArr = [];
        for(let theRec of this.selectedRecList){
            idArr.push(theRec.Id);
        }
        return idArr;
    }

    //run on load
    connectedCallback(){
        try{
            this.colList = [];
            this.selectedRecList = [];
            this.updatedRecIds = [];
            for(let fld of this.fldList){
                this.colList.push(
                    {
                        label: fld.dispLabel,
                        fieldName: fld.fldName,
                        sortable: fld.allowSort,
                        editable: fld.allowEdit,
                        type: fld.fldType == 'picklist'? 'text' : fld.fldType
                    }
                );
            }
            this.setFilteredList([]);
        }catch(e){
            this.logErr(e,'error on callback');
        }
    }

    //function to set filtered list
    @api
    setFilteredList(filterFldList){
        try{
            this.currentFilters = filterFldList;
            //build filters
            let filterVals = ['containsText','selectVals','rangeMin','rangeMax','bool'];
            let filteredFlds = [];
            this.filteredRecList = [];
            for(let fld of filterFldList){
                for(let filterVal of filterVals){
                    if(fld[filterVal]){
                        if(filteredFlds.find(filterFld => {filterFld.fldName == fld.fldName})){
                            filteredFlds.find(filterFld => {filterFld.fldName == fld.fldName})[filterVal] = fld[filterVal];
                        }else{
                            let filterFld = {fldName: fld.fldName};
                            filterFld[filterVal] = fld[filterVal];
                            filteredFlds.push(filterFld);
                        }
                    }
                }
            }
            //set list of filtered records
            if(filteredFlds.length == 0){
                for(let theRec of this.recList){
                    this.filteredRecList.push(Object.assign({},theRec));
                }
            }else{
                for(let theRec of this.recList){
                    let isValid = true;
                    for(let theFilter of filteredFlds){
                        if(theFilter.containsText){
                            isValid = isValid && (theRec[theFilter.fldName]) && theRec[theFilter.fldName].toLowerCase().includes(theFilter.containsText.toLowerCase());
                        }
                        if(theFilter.selectVals){
                            let foundVal = false;
                            if(theRec[theFilter.fldName]){
                                for(let theVal of theFilter.selectVals.split(';')){
                                    foundVal = theRec[theFilter.fldName].includes(theVal);
                                    if(foundVal){
                                        break;
                                    }
                                }
                            }
                            isValid = isValid && foundVal;
                        }
                        if(theFilter.rangeMin){
                            isValid = isValid && parseInt(theRec[theFilter.fldName]) >= theFilter.rangeMin;
                        }
                        if(theFilter.rangeMax){
                            isValid = isValid && parseInt(theRec[theFilter.fldName]) <= theFilter.rangeMax;
                        }
                        if(theFilter.dateMin){
                            isValid = isValid && Date.parse(theRec[theFilter.fldName]) >= Date.parse(theFilter.dateMin);
                        }
                        if(theFilter.dateMax){
                            isValid = isValid && Date.parse(theRec[theFilter.fldName]) <= Date.parse(theFilter.dateMax);
                        }
                        if(theFilter.bool){
                            let checkBool = theFilter.bool == 'Checked';
                            isValid = isValid && theRec[theFilter.fldName] == checkBool;
                        }
                        if(!isValid){
                            break;
                        }
                    }
                    if(isValid){
                        this.filteredRecList.push(Object.assign({},theRec));
                    }
                }
            }
            if(this.sortedBy){
                this.onHandleSort({detail:{fieldName: this.sortedBy, sortDirection: this.sortDirection}});
            }
        }catch(e){
            this.logErr(e,'error on setFilteredList');
        }
    }

    //function for row selection
    handleRowSelection(event){
        try{
            for(let theRec of event.detail.selectedRows){
                if(!this.selectedRecList.find(rec => { return rec.Id === theRec.Id})){
                    this.selectedRecList.push(theRec);
                }
            }
            let recIdsToRemove = [];
            for(let theRec of this.selectedRecList){
                 if(!(event.detail.selectedRows.find(rec => { return theRec.Id === rec.Id})) && (this.filteredRecList.find(rec => { return theRec.Id === rec.Id}))){
                    recIdsToRemove.push(theRec.Id);
                }
            }
            if(recIdsToRemove.length > 0){
                this.selectedRecList = this.selectedRecList.filter(function(value,index,arr){return !(recIdsToRemove.includes(value.Id))});
            }
        }catch(e){
            this.logErr(e,'error on handleRowSelection');
        }
    }

    //function to handle inline edits
    handleInlineEdit(){
        try{
            let _recList = [];
            for(let theRec of this.recList){
                _recList.push(Object.assign({},theRec));
            }
            let draftValues = this.template.querySelector('lightning-datatable').draftValues;
            for(let theValue of draftValues){
                let recId = theValue.Id;
                for(let theAttr in theValue){
                    if(theAttr != 'Id'){
                        _recList.find(rec => { return rec.Id === recId})[theAttr] = theValue[theAttr];
                        this.filteredRecList.find(rec => { return rec.Id === recId})[theAttr] = theValue[theAttr];
                        if((this.selectedRecList) && this.selectedRecList.find(rec => { return rec.Id === recId})){
                            this.selectedRecList.find(rec => { return rec.Id === recId})[theAttr] = theValue[theAttr];
                        }
                    }
                }
                if(!this.updatedRecIds.includes(recId)){
                    this.updatedRecIds.push(recId);
                }
            }
            this.recList = _recList;
            this.template.querySelector('lightning-datatable').draftValues = [];
            this.setFilteredList(this.currentFilters);
        }catch(e){
            this.logErr(e,'error on handleInlineEdit');
        }
    }

    //function to return updates and selected rows to parent
    @api
    returnData(){
        try{
            console.log('returning');
            console.log(this.returnUpdatedRecs);
            console.log(this.updatedRecIds);
            if(this.returnUpdatedRecs){
                //todo logic here to only return records that were updated in the table
                let updatedRecs = [];
                for(let theId of this.updatedRecIds){
                    updatedRecs.push(this.recList.find(rec => { return rec.Id === recId}));
                }
                this.recList = updatedRecs;
            }
            return {
                    theRecs: this.recList,
                    selectedRecs: this.selectedRecList
                };
        }catch(e){
            this.logErr(e,'returnData');
        }
    }

    //functions for sorting
    sortBy(field, reverse, primer) {
        const key = primer
            ? function (x) {
                  return primer(x[field]);
              }
            : function (x) {
                  return x[field];
              };

        return function (a, b) {
            a = key(a);
            b = key(b);
            return reverse * ((a > b) - (b > a));
        };
    }

    onHandleSort(event) {
        const { fieldName: sortedBy, sortDirection } = event.detail;
        const cloneData = [...this.filteredRecList];

        cloneData.sort(this.sortBy(sortedBy, sortDirection === 'asc' ? 1 : -1));
        this.filteredRecList = cloneData;
        this.sortDirection = sortDirection;
        this.sortedBy = sortedBy;
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