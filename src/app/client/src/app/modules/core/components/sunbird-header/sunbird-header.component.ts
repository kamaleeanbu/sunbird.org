import { filter, first } from 'rxjs/operators';
import { UserService, PermissionService, TenantService, OrgDetailsService, FormService } from './../../services';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ConfigService, ResourceService, IUserProfile, IUserData } from '@sunbird/shared';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import * as _ from 'lodash-es';
import { IInteractEventObject, IInteractEventEdata } from '@sunbird/telemetry';
import { CacheService } from 'ng2-cache-service';
import { environment } from '@sunbird/environment';
declare var jQuery: any;

@Component({
  selector: 'app-sunbird-header',
  templateUrl: './sunbird-header.component.html',
  styleUrls: ['./sunbird-header.component.scss']
})
export class SunbirdHeaderComponent implements OnInit {
  languageFormQuery = {
    formType: 'content',
    formAction: 'search',
    filterEnv: 'resourcebundle'
  };
  exploreButtonVisibility: string;
  queryParam: any = {};
  showExploreHeader = false;
  showQrmodal = false;
  tenantInfo: any = {};
  userProfile: IUserProfile;
  adminDashboard: Array<string>;
  announcementRole: Array<string>;
  myActivityRole: Array<string>;
  orgSetupRole: Array<string>;
  avtarMobileStyle = {
    backgroundColor: 'transparent',
    color: '#AAAAAA',
    fontFamily: 'inherit',
    fontSize: '17px',
    lineHeight: '38px',
    border: '1px solid #e8e8e8',
    borderRadius: '50%',
    height: '38px',
    width: '38px'
  };
  avtarDesktopStyle = {
    backgroundColor: 'transparent',
    color: '#AAAAAA',
    fontFamily: 'inherit',
    fontSize: '17px',
    lineHeight: '38px',
    border: '1px solid #e8e8e8',
    borderRadius: '50%',
    height: '38px',
    width: '38px'
  };
  public signUpInteractEdata: IInteractEventEdata;
  public enterDialCodeInteractEdata: IInteractEventEdata;
  public telemetryInteractObject: IInteractEventObject;
  exploreRoutingUrl: string;
  pageId: string;
  searchBox = {
    'center': false,
    'smallBox': false,
    'mediumBox': false,
    'largeBox': false
  };
  slug: string;
  isOffline: boolean = environment.isOffline;
  languages: Array<any>;

  constructor(public config: ConfigService, public resourceService: ResourceService, public router: Router,
    public permissionService: PermissionService, public userService: UserService, public tenantService: TenantService,
    public orgDetailsService: OrgDetailsService, private _cacheService: CacheService, public formService: FormService,
    public activatedRoute: ActivatedRoute, private cacheService: CacheService, private cdr: ChangeDetectorRef) {
      try {
        this.exploreButtonVisibility = (<HTMLInputElement>document.getElementById('exploreButtonVisibility')).value;
      } catch (error) {
        this.exploreButtonVisibility = 'false';
      }
      this.adminDashboard = this.config.rolesConfig.headerDropdownRoles.adminDashboard;
      this.announcementRole = this.config.rolesConfig.headerDropdownRoles.announcementRole;
      this.myActivityRole = this.config.rolesConfig.headerDropdownRoles.myActivityRole;
      this.orgSetupRole = this.config.rolesConfig.headerDropdownRoles.orgSetupRole;
  }
  ngOnInit() {
    if (this.userService.loggedIn) {
      this.userService.userData$.pipe(first()).subscribe((user: any) => {
        if (user && !user.err) {
          this.userProfile = user.userProfile;
            this.getLanguage(this.userService.channel);
        }
      });
    } else {
      this.orgDetailsService.orgDetails$.pipe(first()).subscribe((data) => {
        if (data && !data.err) {
          this.getLanguage(data.orgDetails.hashTagId);
        }
      });
    }
    this.getUrl();
    this.activatedRoute.queryParams.subscribe(queryParams => this.queryParam = { ...queryParams });
    this.tenantService.tenantData$.subscribe(({tenantData}) => {
      console.log('tenant data', tenantData);
      this.tenantInfo.logo = tenantData ? tenantData.logo : undefined;
      this.tenantInfo.titleName = tenantData ? tenantData.titleName.toUpperCase() : undefined;
    });
    this.setInteractEventData();
    this.cdr.detectChanges();
    this.setWindowConfig();
  }
  getLanguage(channelId) {
    const isCachedDataExists = this._cacheService.get(this.languageFormQuery.filterEnv + this.languageFormQuery.formAction);
    if (isCachedDataExists) {
      this.languages = isCachedDataExists[0].range;
    } else {
      const formServiceInputParams = {
        formType: this.languageFormQuery.formType,
        formAction: this.languageFormQuery.formAction,
        contentType: this.languageFormQuery.filterEnv
      };
      this.formService.getFormConfig(formServiceInputParams, channelId).subscribe((data: any) => {
        this.languages = data[0].range;
        this._cacheService.set(this.languageFormQuery.filterEnv + this.languageFormQuery.formAction, data,
          { maxAge: this.config.appConfig.cacheServiceConfig.setTimeInMinutes * this.config.appConfig.cacheServiceConfig.setTimeInSeconds});
      }, (err: any) => {
        this.languages = [{ 'value': 'en', 'label': 'English', 'dir': 'ltr' }];
      });
    }
  }
  navigateToHome() {
    if (this.userService.loggedIn) {
      this.router.navigate(['resources']);
    } else {
      window.location.href = this.slug ? this.slug : '';
    }
  }
  onEnter(key) {
    this.queryParam = {};
    if (key && key.length) {
      this.queryParam.key = key;
    }
    this.router.navigate([this.exploreRoutingUrl, 1], { queryParams: this.queryParam });
  }

  getUrl() {
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe((urlAfterRedirects: NavigationEnd) => {
      let currentRoute = this.activatedRoute.root;
      if (currentRoute.children) {
        while (currentRoute.children.length > 0) {
          const child: ActivatedRoute[] = currentRoute.children;
          child.forEach(route => {
            currentRoute = route;
            if (route.snapshot.data.telemetry) {
              if (route.snapshot.data.telemetry.pageid) {
                this.pageId = route.snapshot.data.telemetry.pageid;
              } else {
                this.pageId = route.snapshot.data.telemetry.env;
              }
            }
          });
        }
      }
      this.slug = _.get(this.activatedRoute, 'snapshot.firstChild.firstChild.params.slug');
      if (_.includes(urlAfterRedirects.url, '/explore')) {
        this.showExploreHeader = true;
        const url = urlAfterRedirects.url.split('?')[0].split('/');
        if (url.indexOf('explore') === 2) {
          this.exploreRoutingUrl = url[1] + '/' + url[2];
        } else {
          this.exploreRoutingUrl = url[1];
        }
      } else if (_.includes(urlAfterRedirects.url, '/explore-course')) {
        this.showExploreHeader = true;
        const url = urlAfterRedirects.url.split('?')[0].split('/');
        if (url.indexOf('explore-course') === 2) {
          this.exploreRoutingUrl = url[1] + '/' + url[2];
        } else {
          this.exploreRoutingUrl = url[1];
        }
      } else {
        this.showExploreHeader = false;
      }
    });
  }

  setInteractEventData() {
    this.signUpInteractEdata = {
      id: 'signup',
      type: 'click',
      pageid: 'public'
    };
    this.telemetryInteractObject = {
      id: '',
      type: 'signup',
      ver: '1.0'
    };
    this.enterDialCodeInteractEdata = {
      id: 'click-dial-code',
      type: 'click',
      pageid: 'explore'
    };
  }

  getLogoutInteractEdata() {
    return {
      id: 'logout',
      type: 'click',
      pageid: this.router.url.split('/')[1]
    };
  }

  logout() {
    window.location.replace('/logoff');
    this.cacheService.removeAll();
  }
  setWindowConfig() {
    if (window.innerWidth <= 1023 && window.innerWidth > 548) {
      this.searchBox.center = true;
      this.searchBox.largeBox = true;
      this.searchBox.smallBox = false;
      this.searchBox.mediumBox = false;
    } else if (window.innerWidth <= 548) {
      this.searchBox.smallBox = true;
      this.searchBox.largeBox = false;
      this.searchBox.mediumBox = false;
    } else {
      this.searchBox.center = false;
      this.searchBox.smallBox = false;
      this.searchBox.largeBox = false;
      this.searchBox.mediumBox = true;
    }
    window.onresize = (e) => {
      if (window.innerWidth <= 1023 && window.innerWidth > 548) {
        this.searchBox.center = true;
        this.searchBox.largeBox = true;
        this.searchBox.smallBox = false;
        this.searchBox.mediumBox = false;
      } else if (window.innerWidth <= 548) {
        this.searchBox.largeBox = false;
        this.searchBox.mediumBox = false;
        this.searchBox.smallBox = true;
      } else {
        this.searchBox.center = false;
        this.searchBox.smallBox = false;
        this.searchBox.largeBox = false;
        this.searchBox.mediumBox = true;
      }
    };
  }
  showSideBar() {
    jQuery('.ui.sidebar').sidebar('setting', 'transition', 'overlay').sidebar('toggle');
  }
}
