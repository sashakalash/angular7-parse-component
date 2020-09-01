import {
  Component,
  ViewChild,
  OnInit,
  ElementRef,
  Renderer2,
  Output,
  EventEmitter
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import {
  NgbDatepicker,
  NgbInputDatepicker,
  NgbDateStruct,
  NgbCalendar,
  NgbDateAdapter,
  NgbDateParserFormatter,
  NgbModal
} from '@ng-bootstrap/ng-bootstrap';
import { NgModel } from '@angular/forms';
import { isEqual, isNil, keys, forEach } from 'lodash';
import { AbstractFormComponent } from 'src/app/core/classes';
import { ReportFilter, ReportFilterSection } from 'src/app/core/models';
import {
  reportTypes,
  reportOneIndexes,
  reportTwoIndexes,
  reportThreeIndexes,
  reportOneSections,
  reportTwoSections,
  reportThreeSections
} from 'src/app/core/constants';
import { ReportTableEvent } from 'src/app/core/models/events';
import { ReportService } from 'src/app/core/services/report.service';

const now = new Date();
const equals = (one: NgbDateStruct, two: NgbDateStruct) =>
  one &&
  two &&
  two.year === one.year &&
  two.month === one.month &&
  two.day === one.day;

const before = (one: NgbDateStruct, two: NgbDateStruct) =>
  !one || !two
    ? false
    : one.year === two.year
    ? one.month === two.month
      ? one.day === two.day
        ? false
        : one.day < two.day
      : one.month < two.month
    : one.year < two.year;

const after = (one: NgbDateStruct, two: NgbDateStruct) =>
  !one || !two
    ? false
    : one.year === two.year
    ? one.month === two.month
      ? one.day === two.day
        ? false
        : one.day > two.day
      : one.month > two.month
    : one.year > two.year;

const isZeroValue = value => isNil(value) || value === 0;

@Component({
  selector: 'app-report-type-filter',
  templateUrl: './report-type-filter.component.html',
  styleUrls: ['./report-type-filter.component.scss']
})
export class ReportTypeFilterComponent extends AbstractFormComponent
  implements OnInit {
  @Output() loadReport: EventEmitter<ReportTableEvent> = new EventEmitter();
  @Output() openFilters: EventEmitter<any> = new EventEmitter();
  @Output() changeFilters: EventEmitter<any> = new EventEmitter();
  @Output() clearReportTable: EventEmitter<any> = new EventEmitter();
  @ViewChild('firstStepFilter') firstStepFilter;
  @ViewChild('secondStepFilter') secondStepFilter;
  reportTypes = reportTypes;
  reportIndexes: ReportFilter[];
  reportSections: ReportFilterSection[];
  obtaining = false;
  startDate: NgbDateStruct;
  hoveredDate: NgbDateStruct;
  fromDate: any;
  toDate: any;
  model: any;
  modalReference;
  filtersCount = 0;
  filtersCountNew = null;
  filters;
  firstHasStep = false;
  secondHasStep = false;
  @ViewChild('d') input: NgbInputDatepicker;
  @ViewChild(NgModel) datePick: NgModel;
  @ViewChild('myRangeInput') myRangeInput: ElementRef;

  isHovered = date =>
    this.fromDate &&
    !this.toDate &&
    this.hoveredDate &&
    after(date, this.fromDate) &&
    before(date, this.hoveredDate);
  isInside = date => after(date, this.fromDate) && before(date, this.toDate);
  isFrom = date => equals(date, this.fromDate);
  isTo = date => equals(date, this.toDate);

  constructor(
    protected formBuilder: FormBuilder,
    element: ElementRef,
    private renderer: Renderer2,
    private _parserFormatter: NgbDateParserFormatter,
    private modalService: NgbModal,
    private reportService: ReportService
  ) {
    super();
  }

  ngOnInit() {
    this.startDate = {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate()
    };
    this.form = this.formBuilder.group({
      reportType: [null, Validators.required],
      reportIndex: [null, Validators.required],
      reportFirstSection: [null],
      reportSecondSection: [null],
      firstStep: [],
      secondStep: [],
      model: ['']
    });
    this.form.valueChanges.subscribe(() => this.changeFilters.emit());
    this.initSelects();
    this.activeFiltersCounter();
  }

  obtainData() {}

  initSelects() {
    this.f.reportType.setValue('tax-free-cheque');
    this.reportIndexes = reportOneIndexes;
    this.reportSections = reportOneSections;
  }

  changeReportType(): void {
    this.f.reportSecondSection.setValue(null);
    switch (this.f.reportType.value) {
      case 'tax-free-cheque': {
        this.reportIndexes = reportOneIndexes;
        this.reportSections = reportOneSections;
        this.f.reportIndex.setValue(null);
        this.f.reportFirstSection.setValue(null);
        this.f.reportSecondSection.setValue(null);
        break;
      }
      case 'commodity': {
        this.reportIndexes = reportTwoIndexes;
        this.reportSections = reportTwoSections;
        this.f.reportIndex.setValue(null);
        this.f.reportFirstSection.setValue(null);
        this.f.reportSecondSection.setValue(null);
        break;
      }
      case 'user': {
        this.reportIndexes = reportThreeIndexes;
        this.reportSections = reportThreeSections;
        this.f.reportIndex.setValue(null);
        this.f.reportFirstSection.setValue(null);
        this.f.reportSecondSection.setValue(null);
        break;
      }
      default:
        break;
    }
    this.onLoadReport();
  }

  changeIndex(): void {
    this.changeSecondSection();
  }

  clearData(): void {
    this.clearReportTable.emit();
  }

  clearSection(): void {
    this.f.firstStep.setValue(null);
    this.f.secondStep.setValue(null);
    this.clearData();
  }

  private checkStepAvailability(value: string): boolean {
    return (
      value === 'CHEQUE_WRITING_AND_FTS_SENT_DELTA_TIME' ||
      value === 'FTS_SENT_AND_VALIDATION_DELTA_TIME' ||
      value === 'FTS_VALIDATION_AND_PAYMENT_DELTA_TIME' ||
      value === 'CHEQUE_WRITING_AND_PAYMENT_DELTA_TIME' ||
      value === 'CHEQUE_WRITING_DURATION' ||
      false
    );
  }

  private checkStepValueAndLoadReposts(): void {
    const firstStepNotValid =
      this.firstHasStep && isZeroValue(this.f.firstStep.value);
    const secondStepNotValid =
      this.secondHasStep && isZeroValue(this.f.secondStep.value);
    if (firstStepNotValid || secondStepNotValid) {
      this.clearData();
      return;
    }
    this.onLoadReport();
  }

  setStep(value, stepNumber: string) {
    this.f[`${stepNumber}Step`].setValue(value);
    const allowRequest =
      stepNumber === 'first'
        ? this.secondHasStep
          ? !isZeroValue(this.f.secondStep.value)
          : true
        : this.firstHasStep
        ? !isZeroValue(this.f.firstStep.value)
        : true;
    if (allowRequest) {
      setTimeout(() => this.checkStepValueAndLoadReposts(), 1000); // delaying request to send correct step value
    }
  }

  changeFirstSection(): void {
    const xValue = this.f.reportFirstSection.value;
    const yValue = this.f.reportSecondSection.value;
    if (isEqual(xValue, yValue)) {
      this.f.reportSecondSection.setValue(null);
    }
    this.firstHasStep = this.checkStepAvailability(xValue);
    if (!isNil(xValue)) {
      this.checkStepValueAndLoadReposts();
    }
  }

  changeSecondSection(): void {
    const xValue = this.f.reportFirstSection.value;
    const yValue = this.f.reportSecondSection.value;
    if (isEqual(xValue, yValue)) {
      this.f.reportFirstSection.setValue(null);
      this.clearData();
      return;
    }
    this.firstHasStep = this.checkStepAvailability(xValue);
    this.secondHasStep = this.checkStepAvailability(yValue);
    if (this.secondHasStep || this.firstHasStep) {
      this.checkStepValueAndLoadReposts();
    } else if (xValue) {
      this.onLoadReport();
    }
  }

  onSwapAxes(): void {
    const xValue = this.f.reportFirstSection.value;
    const yValue = this.f.reportSecondSection.value;
    this.f.reportSecondSection.setValue(xValue);
    this.f.reportFirstSection.setValue(yValue);
    if (isNil(this.f.reportFirstSection.value)) {
      this.clearData();
      return;
    }
    this.firstHasStep = this.checkStepAvailability(yValue);
    this.secondHasStep = this.checkStepAvailability(xValue);
    const v = this.f.firstStep.value;
    this.f.firstStep.setValue(this.f.secondStep.value);
    this.f.secondStep.setValue(v);
    this.swapStepValues();
    this.onLoadReport();
  }

  swapStepValues(): void {
    setTimeout(() => {
      if (this.firstStepFilter) {
        this.firstStepFilter.obtainValues(this.f.firstStep.value);
      }
      if (this.secondStepFilter) {
        this.secondStepFilter.obtainValues(this.f.secondStep.value);
      }
    }, 0);
  }

  onDateSelection(date: NgbDateStruct) {
    let parsed = '';
    if (!this.fromDate && !this.toDate) {
      this.fromDate = date;
    } else if (this.fromDate && !this.toDate && after(date, this.fromDate)) {
      this.toDate = date;
      this.input.close();
    } else {
      this.toDate = null;
      this.fromDate = date;
    }
    if (this.fromDate) {
      parsed += this._parserFormatter.format(this.fromDate);
    }
    if (this.toDate) {
      parsed += ' - ' + this._parserFormatter.format(this.toDate);
    }

    this.renderer.setProperty(this.myRangeInput.nativeElement, 'value', parsed);
  }

  openFiltersModal(el) {
    this.modalReference = this.modalService.open(el, {
      centered: true,
      windowClass: 'small-window-filters'
    });
  }

  onLoadReport() {
    const reportEvent = new ReportTableEvent();
    reportEvent.reportType = this.f.reportType.value;
    reportEvent.reportIndex = this.f.reportIndex.value;
    reportEvent.reportFirstSection = this.f.reportFirstSection.value;
    reportEvent.reportSecondSection = this.f.reportSecondSection.value;
    reportEvent.firstStep = this.f.firstStep.value || null;
    reportEvent.secondStep = this.f.secondStep.value || null;
    reportEvent.fromDate = this.fromDate
      ? new Date(this.fromDate.year, this.fromDate.month - 1, this.fromDate.day)
      : null;
    reportEvent.toDate = this.toDate
      ? new Date(this.toDate.year, this.toDate.month - 1, this.toDate.day)
      : null;
    this.loadReport.emit(reportEvent);
  }

  activeFiltersCounter() {
    if (this.f) {
      this.filters = this.reportService.getFilters(this.f.reportType.value);
      forEach(keys(this.filters), key => {
        if (
          this.filters[key].from ||
          this.filters[key].to ||
          this.filters[key].value.length > 0
        ) {
          this.filtersCount++;
        }
      });
    }
  }
  activeFiltersCount(e) {
    this.filtersCount = e;
    this.onLoadReport();
  }
}
