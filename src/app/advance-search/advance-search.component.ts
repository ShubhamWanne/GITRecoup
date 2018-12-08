import { Component, OnInit} from '@angular/core';
import { RestDoaAdvanceService } from "../DOAService/rest-doa-advance.service"
import { RestDOAService } from "../DOAService/rest-doa.service"
import { ComponentCommService } from "../CommunicationService/component-comm.service"
import { Subscription } from 'rxjs'
import { DateUtil } from '../utils/Date'
import {StringUtils} from '../utils/StringUtils';

@Component({
  selector: 'app-advance-search',
  templateUrl: './advance-search.component.html',
  styleUrls: ['./advance-search.component.scss']
})

export class AdvanceSearchComponent implements OnInit {
  subscription = new Subscription();
  stringUtils= new StringUtils();
  isAdvanceSearchSelected: boolean = false;
  userList: any[]= new Array<any>();
  userName: string;
  previousUserName: string="";
  isInvalidUser: boolean = false;
  userDetailsMap: Map<string, any>= new Map();
  dateUtil= new DateUtil();
  total_result: number;
  result_incrementor: number=1;
  constructor(private advanceDoaService: RestDoaAdvanceService,
              private messageSevice: ComponentCommService,
              private doaService: RestDOAService,
  ) {
    this.subscription = this.messageSevice.getMessage().subscribe(
      message => {
        if (message.to != "advance_search_component") return;
        this.clearState();
        this.isAdvanceSearchSelected = message.data.isAdvanceSearchSelected;
        if(this.isAdvanceSearchSelected) this.populateUser(message.data.msg);
      }
    )
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  populateUser(userName) {
    if(this.previousUserName != "" && this.previousUserName != userName){
      this.clearState();
    }
    this.advanceDoaService.getUsers(userName, this.result_incrementor).then((res) => {
      if(res.data.total_count == 0){
        this.isInvalidUser= true;
        return;
      }
      if(this.result_incrementor == 1){
        this.userName = userName;
        this.userList = res.data.items;
        this.total_result = res.data.total_count;
      }else{
        this.userList = this.userList.concat(res.data.items);
      }
      for(let item of this.userList){
        this.doaService.getUser(item.login).then((res)=>{
          this.userDetailsMap.set(item.login, res.data);
        },(err)=>{
          this.handlerError(err);
        })
      }
    }, (err) => {
      this.handlerError(err);
    })
  }

  getStarCount(score: number){
    if (score <= 25) {
      return new Array(1);
    }
    else if (score <= 50) {
      return new Array(2);
    }
    else if (score <= 75) {
      return new Array(3);
    }
    else if (score <= 100){
      return new Array(4);
    }
    else{
      return new Array(5);
    }
  }

  getUser() {
  }

  handlerError(err){
    console.error(err);
  }

  clearState(){
    console.log("Clearing the previous state ... ");
    this.userList.splice(0);
    this.userDetailsMap.clear();
    this.isInvalidUser= false;
  }

  formatDate(dateFrom){
    return this.dateUtil.getTimeLapsed(new Date(dateFrom));
  }

  visitProfile(userName: string){
    this.messageSevice.sendMessage({
      to: "app_component",
      data: {
        msg: {
          value:{
            user: userName,
          }
        },
        type: "visitProfile"
      },
      from: "advance_search_component"
    });
  }

  viewMore(){
    if(this.result_incrementor <= Math.ceil(this.total_result/30)){
      console.log(this.result_incrementor);
      this.result_incrementor++;
      this.populateUser(this.userName);
    }
  }

  getString(stringVar){
    return this.stringUtils.getString(stringVar);
  }
}
