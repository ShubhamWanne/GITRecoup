import { Component, OnInit, Input } from '@angular/core';
import { AngularWaitBarrier } from 'blocking-proxy/built/lib/angular_wait_barrier';
import { ColorGenerator } from '../../Color';
import { truncate } from 'fs';
import { DateUtil } from '../utils/Date'
import { MarkDown } from '../utils/handleMarkDown'
import { async } from '@angular/core/testing';
import { RestDOAService } from '../DOAService/rest-doa.service'
import {ComponentCommService} from "../CommunicationService/component-comm.service"
import { Subscription } from 'rxjs'
import { cpus } from 'os';
import {StringUtils} from '../utils/StringUtils';

@Component({
  selector: 'app-operation',
  templateUrl: './operation.component.html',
  styleUrls: ['./operation.component.scss']
})

export class OperationComponent implements OnInit {
  subscription: Subscription;
  dateUtil: DateUtil = new DateUtil();
  stringUtils= new StringUtils();
  markDown: MarkDown = new MarkDown();

  isSearchingStarted: boolean = false;
  isSubmitClicked: boolean = false;
  isInvalidUser: boolean = false;
  isShowRepositories: boolean = false;
  isShowRepoDetails = false;
  isReadmeFound= false;
  clickedRepoDetails: any;
  showRepoButtonTag: string = "Show Repositories";
  isShowChart: boolean = false;
  showChartButtonTag: string = "View";
  @Input('user') user: string;
  temp: number = 0;
  URL: string;
  repository: string;
  company: string;
  userDetails: any={};
  repoData: any[];
  followers: any[];
  forksData: any[] = new Array();
  followersDetails = new Map();
  colorGenerator = new ColorGenerator();
  currentRepo: any;
  readmeHtml: string;

  /*
  ---- Chart Details
  */
  public isChartCreated: boolean = false;
  public numberOfCharts: number = 1;
  public numberOfChartsArray= new Array<any>();
  public repoListWithNonZeroForks : Array<any>[];
  public chartType: string = 'polarArea';
  public chartData = new Array<Array<any>>();
  public chartLabels = new Array<Array<any>>();
  public backgroundColor = new Array<Array<any>>();
  public colors= new Array<Array<any>>();
  public chartColors: Array<any> = [{
    hoverBorderColor: ['rgba(0, 0, 0, 0.1)', 'rgba(0, 0, 0, 0.1)', 'rgba(0, 0, 0, 0.1)', 'rgba(0, 0, 0, 0.1)', 'rgba(0, 0, 0, 0.1)'],
    hoverBorderWidth: 0,
  }];
  public chartOptions: any = {
    responsive: true
  };

  /*
  -------- Methods
  */
  constructor(private doaService: RestDOAService, private messageService: ComponentCommService) {
      this.subscription = this.messageService.getMessage().subscribe((message)=>{
        if(message.to != "operation_component") return;
      });
  }

  ngOnInit() {
    this.subscription = new Subscription();
  }
  ngOnDestroy(): void {
  }

  resetData = function () {
    this.isSearchingStarted = false;
    this.isSubmitClicked= false;
    this.isInvalidUser = false;
    this.isShowRepositories= false;
    this.showRepoButtonTag= "Show Repositories";
    this.isShowChart= false;
    this.isChartCreated = false;
    this.showChartButtonTag= "View";
    this.URL= "";
    this.repository= "";
    this.company= "";
    this.userDetails= { };
    this.repoData= [];
    this.followers= [];
    this.followersDetails = new Map();
    this.chartData.length = 0;
    this.chartLabels.length = 0;
    this.backgroundColor.length = 0;
    this.numberOfCharts = 1;
    this.currentRepo = {};
  }

  fetchReadme = function (repo: any) {
    this.clickedRepoDetails = repo;
    this.doaService.getReadme(repo.name, this.userDetails.login).then((res) => {
      var html_data = this.markDown.convertToHTML(res.data);
      this.readmeHtml = html_data;
      var div = document.getElementById("readme");
      div.innerHTML='';
      if(this.readmeHtml.indexOf('404') >=0 ){
        this.isReadmeFound = false;
      }else{
        this.isReadmeFound = true;
        div.insertAdjacentHTML('afterbegin', this.readmeHtml);
      }
    }, (err) => {
      console.error(err);
    })
  }

  fetchUser = function (form: any) {
    if (form.value.user && form.value.user != "") {
      this.doaService.getUser(form.value.user.replace(/\s/g,'')).then((res) => {

        if(res.data.DOAServiceStatus == 404){
          this.isInvalidUser = true;
          return;
        }
        this.isChartCreated = false;
        this.isInvalidUser = false;
        this.isSubmitClicked = true;
        this.userDetails = res.data,
        this.user = res.data.login;
        this.URL = res.data.url;
        this.repository = res.data.public_repos;
        this.company = res.data.company;

        if (this.company == null) this.company = "Personal"

        this.doaService.getRepoDetails(this.userDetails.repos_url).then((resRepo) => {
          this.repoData = resRepo.data;
          console.log(this.repoData);
        }, (err2) => {
          console.error(err2);
        });

      }, (err) => {
        console.error(err);
      })
    }else{
      this.isInvalidUser= true;
    }
  }

  fetchFollowers = function () {
    this.doaService.getFollowers(this.userDetails.followers_url).then((res) => {
      this.followers = res.data;
      for (let follower of this.followers) {
        this.doaService.getUser(follower.login).then((resUser) => {
          this.followersDetails.set(follower.login, resUser.data);
        }, (err) => {
          console.error("User not found " + err);
        })
      }
    }, (err) => {
      console.error(err);
    });
  }

  fetchRepo = function () {
    this.isShowChart = false;
    this.showChartButtonTag = "View";

    this.isShowRepositories = !this.isShowRepositories;
    this.showRepoButtonTag = this.isShowRepositories ? "Hide Repositories" : "Show Repositories";
    if (!this.repoData) {
      this.doaService.getRepoDetails(this.userDetails.repos_url).then((res) => {
        this.repoData = res.data;
      }, (err) => {
        console.error(err);
      })
    }
  }

  createChart = function (repoTobeCharted, index: number) {
    this.colors[index]= [{
      hoverBorderColor: ['rgba(0, 0, 0, 0.1)', 'rgba(0, 0, 0, 0.1)', 'rgba(0, 0, 0, 0.1)', 'rgba(0, 0, 0, 0.1)', 'rgba(0, 0, 0, 0.1)'],
      hoverBorderWidth: 0
    }];
    this.chartData[index]= new Array();
    this.chartLabels[index]= new Array();
    this.backgroundColor[index]= new Array();
    for (let repo of repoTobeCharted) {
      if(repo.forks_count == 0) continue;
      this.chartData[index].push(repo.forks_count);
      this.chartLabels[index].push(
        repo.name
      );
      this.backgroundColor[index].push(this.colorGenerator.materialColor());
    }
    this.colors[index][0].backgroundColor = this.backgroundColor[index];
    this.chartColors[0].backgroundColor = this.backgroundColor[0];
    console.log("------------------------------ "+ index +"------------------------------ ")
    console.log("Background Color : "+ this.backgroundColor[index]);
    console.log("Chart Data : " +  this.chartData[index]);
    console.log("Chart Labels : "+ this.chartLabels[index]);
    console.log("Color : "+ JSON.stringify(this.colors[index]))
  }

  viewChart(){
    this.isShowRepositories = false;
    this.showRepoButtonTag = "Show Repositories";
    this.isShowChart = true;
    if(!this.isChartCreated)
    {
      if(this.repoData.length == 0) return;

      this.isChartCreated = true;      
      this.repoListWithNonZeroForks = this.repoData.filter((repo)=>{
        return repo.forks_count > 0;
      })
      console.log("repoListWithNonZeroForks length : " + this.repoListWithNonZeroForks.length);
      
      this.numberOfCharts = Math.ceil(this.repoListWithNonZeroForks.length / 30);

      console.log("Number of Charts : "+ this.numberOfCharts);

      this.numberOfChartsArray= new Array(this.numberOfCharts);
      for(var i=0;i<this.numberOfCharts;i++) this.numberOfChartsArray[i]=i;

      var index=0;
      for(var i=0; i<this.numberOfCharts; i++){
          this.createChart(this.repoListWithNonZeroForks.splice(0, 30), index);
          index++;
      }
    }

  }


  public chartClicked(e: any): void { }

  public chartHovered(e: any): void { }

  public getStartCount(numberOfForks, numberOfIssues): any[] {
    if (numberOfIssues >= numberOfForks || numberOfForks == 0) {
      return new Array(1);
    }
    if (Math.abs(numberOfForks - numberOfIssues) <= 25) {
      return new Array(2);
    }
    else if (Math.abs(numberOfForks - numberOfIssues) <= 50) {
      return new Array(3);
    }
    else if (Math.abs(numberOfForks - numberOfIssues) <= 75) {
      return new Array(4);
    }
    else {
      return new Array(5);
    }
  }

  getFormattedDate(dateFrom) {
    return this.dateUtil.getTimeLapsed(new Date(dateFrom));
  }

  getCurrentRepo(repo: any) {
    this.forksData.length = 0;
    this.isShowRepoDetails = true;
    this.currentRepo = repo;
    this.doaService.getForksList(repo.name, this.userDetails.login).then((res) => {
      this.forksData = res.data;
      for (let item of this.forksData) {
        this.doaService.getUser(item.owner.login).then((data) => {
          item.userDetails = data;
        }, (err) => {
          console.error(err);
        })
      }
    }, (err) => {
      console.error(err);
    })
  }
  getString(stringVar){
    return this.stringUtils.getString(stringVar);
  }
}
