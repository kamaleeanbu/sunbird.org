import { Component, OnInit, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import {
  ResourceService, ConfigService, ToasterService, ServerResponse, IUserData, IUserProfile, Framework,
  ILoaderMessage, NavigationHelperService, BrowserCacheTtlService
} from '@sunbird/shared';
import { ActivatedRoute, Router } from '@angular/router';
import { SpaceEditorService } from '../../services/space-editor/space-editor.service';
import { SearchService, UserService, FrameworkService, FormService } from '@sunbird/core';
import * as _ from 'lodash-es';
import { CacheService } from 'ng2-cache-service';
import { SpaceDefaultTemplateComponent } from '../space-default-template/space-default-template.component';
import { IInteractEventInput, IImpressionEventInput } from '@sunbird/telemetry';
import { MyAsset } from '../../classes/myasset';
import { MyassetsService } from '../../services';
import { combineLatest, Subscription, Subject, of, throwError } from 'rxjs';
import { takeUntil, first, mergeMap, map, tap, filter, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-space-data-driven',
  templateUrl: './space-data-driven.component.html',
  styleUrls: ['./space-data-driven.component.scss']
})
export class SpaceDataDrivenComponent extends MyAsset implements OnInit, OnDestroy {
  @ViewChild('formData') formData: SpaceDefaultTemplateComponent;
  @ViewChild('modal') modal;
  announcementForm: FormGroup;

  /**
	 * This variable hepls to show and hide page loader.
   * It is kept true by default as at first when we comes
   * to a page the loader should be displayed before showing
   * any data
	 */
  showLoader = true;
  /**
* To show toaster(error, success etc) after any API calls
*/
  private toasterService: ToasterService;

  /**
* urlString for get url details
*/
  private urlString;
  /**
* contentType is creation type, fected from url
*/
  public contentType;
  /**
   * resourceType is resource type
   */
  public resourceType;
  /**
 * userForm name creation
 */
  public creationForm: FormGroup;
  /**
 * userProfile is of type userprofile interface
 */
  public userProfile: IUserProfile;
  /**
* Contains config service reference
*/
  public configService: ConfigService;
  /**
 * To make inbox API calls
 */
  private editorService: SpaceEditorService;
  /**
  * To call resource service which helps to use language constant
  */
  public resourceService: ResourceService;
  /**
 * To call resource service which helps to use language constant
 */
  public userService: UserService;
  /**
 * To send activatedRoute.snapshot to routerNavigationService
 */
  public activatedRoute: ActivatedRoute;
  /**
  * loader message
  */
  loaderMessage: ILoaderMessage;

  public frameworkService: FrameworkService;

  public formService: FormService;

  public formType = 'content';

  public formAction = 'create';

  public getFormFields: any;

  public formFieldProperties: any;

  public categoryMasterList: any;

  public creationFormLable: string;

  public name: string;

  public description: string;

  public isCachedDataExists: boolean;

  public framework: string;
  public showButton = false;
  public submit = false;

  public link: string;
  /**
	* telemetryImpression
	*/
  telemetryImpression: IImpressionEventInput;

  percentDone: number;
  uploadSuccess = false;
  showMessage = false;

  enabled: any;
  fileList: any;
  contentId: string;
  status = 'draft';
  frameworks = 'societal_platform';
  uploadFile = false;
  uploadContent = false;
  uploadLink: string;
  lang: string;

  constructor(
    public searchService: SearchService,
    public workSpaceService: MyassetsService,
    activatedRoute: ActivatedRoute,
    frameworkService: FrameworkService,
    private router: Router,
    resourceService: ResourceService,
    toasterService: ToasterService,
    editorService: SpaceEditorService,
    userService: UserService,
    configService: ConfigService,
    formService: FormService,
    private _cacheService: CacheService,
    public navigationHelperService: NavigationHelperService
  ) {
    super(searchService, workSpaceService, userService);
    this.activatedRoute = activatedRoute;
    this.resourceService = resourceService;
    this.toasterService = toasterService;
    this.editorService = editorService;
    this.userService = userService;
    this.configService = configService;
    this.frameworkService = frameworkService;
    this.formService = formService;
    this.contentType = 'studymaterial';

    this.resourceType = this.configService.appConfig.resourceType[this.contentType];
    this.creationFormLable = this.configService.appConfig.contentCreateTypeLable[this.contentType];
    this.name = this.configService.appConfig.contentName[this.contentType] ?
      this.configService.appConfig.contentName[this.contentType] : 'Untitled';
    this.description = this.configService.appConfig.contentDescription[this.contentType] ?
      this.configService.appConfig.contentDescription[this.contentType] : 'Untitled';
    this.uploadLink = 'link';
  }


  ngOnInit() {
    console.log('this.activated ', this.activatedRoute);
    // this.checkForPreviousRouteForRedirect();

    /**
     * fetchFrameworkMetaData is called to config the form data and framework data
     */
    this.fetchFrameworkMetaData();
    /***
 * Call User service to get user data
 */
    this.userService.userData$.subscribe(
      (user: IUserData) => {
        if (user && !user.err) {
          this.userProfile = user.userProfile;
        }
      });

    // this.telemetryImpression = {
    //   context: {
    //     env: this.activatedRoute.snapshot.data.telemetry.env
    //   },
    //   edata: {
    //     type: this.activatedRoute.snapshot.data.telemetry.type,
    //     pageid: this.activatedRoute.snapshot.data.telemetry.pageid,
    //     subtype: this.activatedRoute.snapshot.data.telemetry.subtype,
    //     uri: this.activatedRoute.snapshot.data.telemetry.uri
    //   }
    // };
  }
  ngOnDestroy() {
    if (this.modal && this.modal.deny) {
      this.modal.deny();
    }
    // this.goToCreate();
  }
  /**
  * fetchFrameworkMetaData is gives form config data
  */
  fetchFrameworkMetaData() {

    this.frameworkService.frameworkData$.subscribe((frameworkData: Framework) => {

      if (!frameworkData.err) {
        this.categoryMasterList = _.cloneDeep(frameworkData.frameworkdata['defaultFramework'].categories);
        this.framework = frameworkData.frameworkdata['defaultFramework'].code;
        /**
  * isCachedDataExists will check data is exists in cache or not. If exists should not call
  * form api otherwise call form api and get form data
  */

        this.isCachedDataExists = this._cacheService.exists(this.contentType + this.formAction);
        if (this.isCachedDataExists) {
          const data: any | null = this._cacheService.get(this.contentType + this.formAction);
          this.formFieldProperties = data;
        } else {
          const formServiceInputParams = {
            formType: this.formType,
            formAction: this.formAction,
            contentType: this.contentType,
            // framework: this.framework
          };
          this.formService.getFormConfig(formServiceInputParams).subscribe(
            (data: ServerResponse) => {

              this.formFieldProperties = data;
              this.getFormConfig();
            },
            (err: ServerResponse) => {
              this.toasterService.error(this.resourceService.messages.emsg.m0005);
            }
          );
        }
      } else if (frameworkData && frameworkData.err) {
        this.toasterService.error(this.resourceService.messages.emsg.m0005);
      }
    });
  }

  /**
   * @description            - Which is used to config the form field vlaues
   * @param {formFieldProperties} formFieldProperties  - Field information
   */
  getFormConfig() {
    _.forEach(this.categoryMasterList, (category) => {
      _.forEach(this.formFieldProperties, (formFieldCategory) => {
        if (category.code === formFieldCategory.code) {
          formFieldCategory.range = category.terms;
        }
        return formFieldCategory;
      });
    });
    this.formFieldProperties = _.sortBy(_.uniqBy(this.formFieldProperties, 'code'), 'index');
    this._cacheService.set(this.contentType + this.formAction, this.formFieldProperties,
      {
        maxAge: this.configService.appConfig.cacheServiceConfig.setTimeInMinutes *
          this.configService.appConfig.cacheServiceConfig.setTimeInSeconds
      });
  }
  /****
* Redirects to workspace create section
*/
  goToCreate() {
    setTimeout(() => {
      this.router.navigate(['/myassets']);
    }, 1700);
  }

  /**
* requestBody is returned of type object
*/
  generateData(data) {

    this.showLoader = true;
    const requestData = _.cloneDeep(data);
    console.log('request data from asset creation = ', requestData);
    data.submittedBy = requestData.creator;
    data.creators = requestData.creators;
    data.source = requestData.link;
      requestData.name = data.name ? data.name : this.name,
      requestData.description = data.description ? data.description : this.description,
      requestData.createdBy = this.userProfile.id,
      requestData.createdFor = this.userProfile.organisationIds,
      // requestData.contentType = this.configService.appConfig.contentCreateTypeForEditors[this.contentType],
      // requestData.framework = this.framework;
    requestData.region = [data.region];
    requestData.version = '' + parseFloat(requestData.version);
    requestData.organisation = this.userProfile.organisationNames;

    if (!!data.link && this.uploadLink === 'link') {
      requestData.mimeType = 'text/x-url';
      requestData['artifactUrl'] = data.link;
    } else if (this.contentType === 'studymaterial' && this.uploadLink === 'uploadContent') {
      requestData.mimeType = this.configService.appConfig.CONTENT_CONST.CREATE_LESSON;
    } else if (this.uploadLink === 'uploadFile') {
      console.log('file name = ', this.fileList);
      requestData.mimeType = 'application/pdf';
    }
    // if (this.resourceType) {
    //   requestData.resourceType = this.resourceType;
    // }
    if (!_.isEmpty(this.userProfile.lastName)) {
      requestData.submittedBy = this.userProfile.firstName + ' ' + this.userProfile.lastName;
    } else {
      requestData.submittedBy = this.userProfile.firstName;
    }
    delete requestData.board;
    // delete requestData.creators;
    delete requestData.gradeLevel;
    delete requestData.board;
    delete requestData.link;
    delete requestData.languages;
    console.log('after deleting content properties in asset creation = ', requestData);
    return requestData;
  }



  isDisabled(event) {
    console.log('event', event);
    this.uploadLink = event.target.value;
    if (event.target.value === 'uploadContent') {
      this.uploadContent = true;
    } else {
      this.enabled = !this.enabled;
      this.uploadContent = false;
    }
  }
  checkFields() {
    this.formData.formInputData['link'] = this.link;
    const data = _.pickBy(this.formData.formInputData);
    console.log('data in checking fields = ', data);
    if (!!data.name && !!data.description && !!data.board && !!data.keywords
      && !!data.creators && !!data.version
      && !!data.year && !!data.region && !!data.languages) {
      this.uploadSuccess = true;
      this.createContent(data);
    } else {
      this.toasterService.error('Asset creation failed please provide required fields');
    }
  }
  createContent(data) {

    const requestData = {
      asset: this.generateData(_.pickBy(this.formData.formInputData))
    };
    requestData.asset.assetType = data.board;
    if (data.gradeLevel !== undefined) {
    requestData.asset.sector = data.gradeLevel[0];
    }
    requestData.asset.language = data.languages;
    requestData.asset.artifactUrl = data.link;
    requestData.asset.creator = data.creator;
    requestData.asset.source = data.link;
    requestData.asset.lastSubmittedOn = data.lastSubmittedOn;
    requestData.asset.resourceType = 'Learn';
    requestData.asset.contentType = 'Resource';

    console.log('request param = ', requestData, data.gradeLevel);
    if (this.contentType === 'studymaterial' && this.uploadSuccess === true) {
      this.workSpaceService.createAsset(requestData).subscribe(res => {
        console.log('after creating asset res = ', res);
        localStorage.setItem(res.result.node_id, JSON.stringify('Draft'));
        localStorage.setItem('creator', JSON.stringify(this.userService.userid));
        const state = JSON.parse(localStorage.getItem(res.result.node_id));
        const creatorId = JSON.parse(localStorage.getItem(res.result.node_id));
        console.log('state = ', state, 'creator id = ', creatorId);

        this.contentId = res.result.node_id;
        if (this.uploadLink === 'uploadFile') {
          this.updateAssetStatus(res.result.node_id, 'file');
          this.toasterService.info('Redirected to upload File Page');
          this.routetoediter();
          // this.uploadFileEvent(); 
        } else if (this.uploadLink === 'uploadContent') {
          this.toasterService.success('Asset created successfully');
          this.routeToContentEditor({ identifier: res.result.node_id });
        } else {
          this.updateAssetStatus(res.result.node_id, 'asset');
          this.toasterService.success('Asset created successfully');
          this.goToCreate();
        }
      }, err => {
        this.toasterService.error('Asset creation failed please check the required fields.');
      });
    } else {
      this.toasterService.error('Asset creation failed');
    }
    // this.goToCreate();
  }
  updateAssetStatus(assetId, state) {
    let assetStatus;
    if (state === 'file') {
      assetStatus = 'Draft';
    } else {
      assetStatus = 'Draft';
    }
    const option = {
      asset: {
        identifier: assetId,
        status: assetStatus
      }
    };
    console.log('updating asset status');
 this.workSpaceService.updateAsset(option).subscribe(
  (data: ServerResponse) => {
    this.showLoader = false;
    this.toasterService.success('Asset status updated ');
  },
  (err: ServerResponse) => {
    this.showLoader = false;
    this.toasterService.error(this.resourceService.messages.fmsg.m0022);
  }
);
  }
  routeToContentEditor(content) {
    setTimeout(() => {
      this.router.navigate(['/myassets']);
    }, 1700);
    setTimeout(() => {
      this.createLockAndNavigateToEditor(content);
    }, 1800);
  }
  createLockAndNavigateToEditor(content) {
    const state = 'draft';
    const framework = this.framework;
    //  this.goToCreate();
    this.router.navigate(['myassets/create/edit/content', content.identifier, state, framework, 'Draft']);
  }

  redirect() {
    this.router.navigate(['/myassets/create']);
  }

  basicUploadFile(event) {
    console.log('event while upload file', event);
    this.fileList = event.target.files[0];
  }


  routetoediter() {
    // edit/generic/:contentId/:state/:framework/:contentStatus
    setTimeout(() => {
      this.router.navigate(['/myassets']);
    }, 1700);
    setTimeout(() => {
      // this.router.navigate(['myassets/create/edit/generic', this.contentId, this.status, 'Draft']);
     this.router.navigate(['myassets/edit/generic']);
   }, 1800);
  }

  uploadFileEvent() {
      console.log('fileList', this.fileList);
      const data = {
        fileName: this.fileList.name
      };
      const request = {
        content: data
      };
      console.log('request in upload file', request);
      // debugger;
      this.editorService.uploadUrl(request, this.contentId).subscribe(res => {
        console.log('file upload responce = ', res);
        this.toasterService.success('uploaded successfully');
        const pdfurl = res.result.pre_signed_url.substring(0, res.result.pre_signed_url.lastIndexOf('?'));
        this.workSpaceService.uploadPreSigned(res.result.pre_signed_url, this.fileList).subscribe(ress => {
          console.log('pre singned url responce = ', ress);
          this.editorService.upload(pdfurl, this.contentId).subscribe(response => {
            console.log('ress', response);
  
          });
          this.goToCreate();
  
        }, err => {
          this.toasterService.error('asset creation failed');
        }
  
        );
  
        // this.editorService.upload()
      }, err => {
        this.toasterService.error('asset creation failed');
      });
  
    }

}
