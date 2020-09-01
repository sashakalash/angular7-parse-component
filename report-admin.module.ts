import { NgModule, LOCALE_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InlineSVGModule } from 'ng-inline-svg';
import { SlickModule } from 'ngx-slick';
import { IconSpriteModule } from 'ng-svg-icon-sprite';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE
} from '@angular/material';
import { MY_DATE_FORMATS, MyDateAdapter } from '../../utility/date-adapter';
import { PerfectScrollbarModule } from 'ngx-perfect-scrollbar';
import { SharedModuleModule } from 'src/app/modules/shared/shared-module.module';
import { ReportAdminRoutingModule } from './report-admin.routing.module';
import { ReportAdminComponent } from './pages/report-admin.component';
import { ReportTypeFilterComponent } from './pages/report-type-filter/report-type-filter.component';
import { ReportTableComponent } from './pages/report-table/report-table.component';
import { ReportEmptyComponent } from 'src/app/modules/shared/components/report-empty-component/report-empty.component';
import { NgxPrintModule } from 'ngx-print';
import { ReportFiltersModalComponent } from './pages/report-filters-modal/report-filters-modal.component';
import {
  OWL_DATE_TIME_FORMATS,
  OWL_DATE_TIME_LOCALE,
  OwlDateTimeIntl,
  OwlDateTimeModule,
  OwlNativeDateTimeModule
} from 'ng-pick-datetime';
import { StepFilterComponent } from './pages/step-filter/step-filter.component';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { MY_CUSTOM_FORMATS, MY_FORMATS_MATERIAL } from '../../core';
import { CustomOwlDateControls } from '../../core/classes/CustomOwlDateControls';
import { OwlMomentDateTimeModule } from 'ng-pick-datetime-moment';

@NgModule({
  declarations: [
    ReportAdminComponent,
    ReportFiltersModalComponent,
    ReportTypeFilterComponent,
    ReportTableComponent,
    ReportEmptyComponent,
    StepFilterComponent
  ],
  imports: [
    CommonModule,
    SharedModuleModule,
    ReportAdminRoutingModule,
    InlineSVGModule.forRoot(),
    SlickModule.forRoot(),
    IconSpriteModule,
    IconSpriteModule.forRoot({ path: 'assets/sprites/sprite.svg' }),
    PerfectScrollbarModule,
    NgxPrintModule,
    OwlDateTimeModule,
    OwlNativeDateTimeModule,
    OwlMomentDateTimeModule
  ],
  entryComponents: [],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'ru' },
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE]
    },
    { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS_MATERIAL },
    { provide: OWL_DATE_TIME_FORMATS, useValue: MY_CUSTOM_FORMATS },
    { provide: OWL_DATE_TIME_LOCALE, useValue: 'ru' },
    { provide: OwlDateTimeIntl, useClass: CustomOwlDateControls },
    { provide: LOCALE_ID, useValue: 'ru' }
  ]
})
export class ReportAdminModule {}
