import { ContentService, PublicDataService, UserService, UploadContentService} from '@sunbird/core';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ConfigService, ServerResponse } from '@sunbird/shared';
import { map, switchMap, catchError } from 'rxjs/operators';
import * as _ from 'lodash-es';
import { MyassetsService } from '../../services/my-assets/myassets.service';

@Injectable({
  providedIn: 'root'
})
export class SpaceEditorService {
  /**
     * base Url for content api
     */
    baseUrl: string;
    /**
     * reference of config service.
     */
    public configService: ConfigService;
    /**
     * reference of content service.
     */
    public contentService: ContentService;
    /**
     * reference of lerner service.
     */
    public publicDataService: PublicDataService;

    public uploadService: UploadContentService;
    /**
     * constructor
     * @param {ConfigService} config ConfigService reference
     */
    constructor(configService: ConfigService, contentService: ContentService, publicDataService: PublicDataService,
        public uploadservice: UploadContentService,
        public workspaceService: MyassetsService, public userService: UserService) {
        this.configService = configService;
        this.contentService = contentService;
        this.baseUrl = this.configService.urlConFig.URLS.CONTENT_PREFIX;
        this.publicDataService = publicDataService;
        this.uploadService = uploadservice;
    }

    /**
     * Create content Id for the editor
     * @param req OBJECT
     */
    create(req): Observable<ServerResponse> {
      if (_.get(req, 'content.subject') && !_.isArray(_.get(req, 'content.subject'))) {
        const subject = [];
        subject.push(req.content.subject);
        req.content.subject = subject;
      }
      if (_.get(req, 'content.medium') && !_.isArray(_.get(req, 'content.medium'))) {
        const medium = [];
        medium.push(req.content.medium);
        req.content.medium = medium;
      }
        const option = {
            url: this.configService.urlConFig.URLS.CONTENT.CREATE,
            data: {
                'request': req
            }
        };
        console.log('create = ', option);
        return this.contentService.post(option);
    }
    /**
     * get content details by id and query param
     */
    getContent(contentId: string, option: any = { params: {} }): Observable<ServerResponse> {
        const param = { fields: this.configService.editorConfig.DEFAULT_PARAMS_FIELDS };
        const req = {
            url: `${this.configService.urlConFig.URLS.CONTENT.GET}/${contentId}`,
            param: { ...param, ...option.params }
        };
        return this.publicDataService.get(req).pipe(map((response: ServerResponse) => {
            return response;
        }));
    }
    uploadUrl(req, contentId: string): Observable<ServerResponse> {
        const option = {
            url: `${this.configService.urlConFig.URLS.CONTENT.UPLOADURL}/${contentId}`,
            data: {
                'request': req
            }
           };
           console.log('option ', option);
           return this.uploadService.post(option);
    }
    update(req, contentId: string): Observable<ServerResponse> {
        const option = {
         url: `${this.configService.urlConFig.URLS.CONTENT.UPDATE}/${contentId}`,
         data: {
             'request': req
         }
        };
        return this.contentService.patch(option);
    }
    upload(req, contentId: string): Observable<ServerResponse> {
        const formdata = new FormData();
      formdata.append('fileUrl', req);
      formdata.append('mimeType', 'application/pdf');
        const option = {
            url: `${this.configService.urlConFig.URLS.CONTENT.UPLOAD}/${contentId}`,
            // formdata: formdata
           };
           console.log('option ', option);
           return this.uploadService.posting(option, formdata);
    }
    getOwnershipType() {
        const formServiceInputParams = {
            formType: 'content',
            subType: 'all',
            formAction: 'ownership',
            rootOrgId: this.userService.userProfile.rootOrgId
        };
        return this.workspaceService.getFormData(formServiceInputParams).pipe(
            map(data => {
                return _.get(data, 'result.form.data.fields[0].ownershipType') ?
                data.result.form.data.fields[0].ownershipType : ['createdBy'];
            }), catchError(error => {
                return of(['createdBy']);
            })
        );
    }
}
