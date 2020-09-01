import {
  Component,
  OnInit,
  EventEmitter,
  Output,
  LOCALE_ID,
  Inject,
  Input,
  AfterViewInit
} from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ReportService } from 'src/app/core/services/report.service';
import { Filters } from 'src/app/core/models/Report/Filters';
import { AbstractFormComponent } from 'src/app/core/classes';
import { FormBuilder, FormControl, FormArray } from '@angular/forms';
import {
  forEach,
  keys,
  find,
  includes,
  isEmpty,
  cloneDeep,
  isNil,
  map,
  omit,
  isArray,
  findKey
} from 'lodash';
import * as moment from 'moment';
import {
  FiltersName,
  reportOneSections,
  reportTwoSections,
  reportThreeIndexes,
  reportThreeSections,
  registrationMethod,
  actualitysSource,
  inputMethod,
  paymentSystems,
  reportsChequeStatuses,
  fiscalSource,
  quarters,
  months,
  PAYMENT_SYSTEMS
} from 'src/app/core/constants';
import { ReportFilterSection } from 'src/app/core/models';
import { DictionaryService } from 'src/app/core/services';
import { Filter } from 'src/app/core/models/Report/Filter';

const isNilOrEmpty = value => {
  return isNil(value) || value === '';
};

@Component({
  selector: 'app-report-filters-modal',
  templateUrl: './report-filters-modal.component.html',
  styleUrls: ['./report-filters-modal.component.scss']
})
export class ReportFiltersModalComponent extends AbstractFormComponent
  implements OnInit, AfterViewInit {
  @Input() reportType: string;
  filters: Filters;
  objectKeys = Object.keys;
  reportSections: ReportFilterSection[];
  countries;
  currencies;
  comodities;
  filtersCount = 0;
  filtersResetNoty: boolean;
  @Output() filtersCountOutput = new EventEmitter();
  ort;
  years = [];
  startYear = 2019;
  startDate = new Date(2019, 0, 1);
  currentDate = new Date();
  map = map;
  constructor(
    private reportService: ReportService,
    private modalService: NgbModal,
    protected formBuilder: FormBuilder,
    private dictionaryService: DictionaryService
  ) {
    super();
  }

  ngOnInit() {
    this.loadOrt();
    this.loadCountries();
    this.loadCurrencies();
    this.loadComodities();
    this.getYears();
    this.filters = this.reportService.getFilters(this.reportType);
    this.initSections();
    this.form = this.formBuilder.group({});
    this.form.valueChanges.subscribe(val => this.checkSubmit());
    this.addControls();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.validateYear();
      this.validateDay();
      this.validateQuarter();
      this.validateMonth();
      forEach(keys(this.filters), key => {
        const section = find(
          this.reportSections,
          r => r.code === key
        ) as ReportFilterSection;
        if (
          section &&
          section.type === 'bound' &&
          !includes(['YEAR', 'DAY', 'MONTH', 'QUARTER'], key)
        ) {
          this.validateInterval(key);
        }
      });
      this.checkSubmit();
    });
  }

  private getControlValue(key: string): string[] | object {
    switch (key) {
      case 'PAYMENT_SYSTEM':
        return this.getPaymentSystemName(key);
      case 'TRADING_ORGANIZATION':
        return map(this.filters[key].value, 'code');
      default:
        return this.filters[key].value;
    }
  }

  addControls() {
    if (isNil(this.filters)) {
      this.filters = {};
    }
    forEach(this.reportSections, section => {
      const key = section.code;
      if (section) {
        this.checkFilterByKey(key);
        switch (section.type) {
          case 'multiple': {
            const value = this.getControlValue(key);
            this.form.addControl(`${key}`, new FormControl(value || null, []));
            break;
          }
          case 'bound': {
            switch (key) {
              case 'YEAR': {
                this.form.addControl(
                  `${key}_from`,
                  new FormControl(this.filters[key].from || null, [])
                );
                this.form.addControl(
                  `${key}_to`,
                  new FormControl(this.filters[key].to || null, [])
                );
                this.f[`${key}_from`].valueChanges.subscribe(val =>
                  this.validateYear()
                );
                this.f[`${key}_to`].valueChanges.subscribe(val =>
                  this.validateYear()
                );
                break;
              }
              case 'DAY': {
                this.form.addControl(
                  `${key}_from`,
                  new FormControl(this.filters[key].from || null, [])
                );
                this.form.addControl(
                  `${key}_to`,
                  new FormControl(this.filters[key].to || null, [])
                );
                this.f[`${key}_from`].valueChanges.subscribe(val =>
                  this.validateDay()
                );
                this.f[`${key}_to`].valueChanges.subscribe(val =>
                  this.validateDay()
                );
                break;
              }
              case 'QUARTER': {
                const valuesFrom = this.filters[key].from
                  ? this.filters[key].from.split('-')
                  : null;
                const valuesTo = this.filters[key].to
                  ? this.filters[key].to.split('-')
                  : null;
                this.form.addControl(
                  `${key}_from_y`,
                  new FormControl(
                    valuesFrom && valuesFrom[0] ? valuesFrom[0] : null,
                    []
                  )
                );
                this.form.addControl(
                  `${key}_from_q`,
                  new FormControl(
                    valuesFrom && valuesFrom[1] ? valuesFrom[1] : null,
                    []
                  )
                );
                this.form.addControl(
                  `${key}_to_y`,
                  new FormControl(
                    valuesTo && valuesTo[0] ? valuesTo[0] : null,
                    []
                  )
                );
                this.form.addControl(
                  `${key}_to_q`,
                  new FormControl(
                    valuesTo && valuesTo[1] ? valuesTo[1] : null,
                    []
                  )
                );
                this.f[`${key}_from_y`].valueChanges.subscribe(val =>
                  this.validateQuarter()
                );
                this.f[`${key}_to_y`].valueChanges.subscribe(val =>
                  this.validateQuarter()
                );
                this.f[`${key}_from_q`].valueChanges.subscribe(val =>
                  this.validateQuarter()
                );
                this.f[`${key}_to_q`].valueChanges.subscribe(val =>
                  this.validateQuarter()
                );
                break;
              }
              case 'MONTH': {
                const valuesFrom = this.filters[key].from
                  ? this.filters[key].from.split('-')
                  : null;
                const valuesTo = this.filters[key].to
                  ? this.filters[key].to.split('-')
                  : null;
                this.form.addControl(
                  `${key}_from_y`,
                  new FormControl(
                    valuesFrom && valuesFrom[0] ? valuesFrom[0] : null,
                    []
                  )
                );
                this.form.addControl(
                  `${key}_from_m`,
                  new FormControl(
                    valuesFrom && valuesFrom[1] ? valuesFrom[1] : null,
                    []
                  )
                );
                this.form.addControl(
                  `${key}_to_y`,
                  new FormControl(
                    valuesTo && valuesTo[0] ? valuesTo[0] : null,
                    []
                  )
                );
                this.form.addControl(
                  `${key}_to_m`,
                  new FormControl(
                    valuesTo && valuesTo[1] ? valuesTo[1] : null,
                    []
                  )
                );
                this.f[`${key}_from_y`].valueChanges.subscribe(val =>
                  this.validateMonth()
                );
                this.f[`${key}_to_y`].valueChanges.subscribe(val =>
                  this.validateMonth()
                );
                this.f[`${key}_from_m`].valueChanges.subscribe(val =>
                  this.validateMonth()
                );
                this.f[`${key}_to_m`].valueChanges.subscribe(val =>
                  this.validateMonth()
                );
                break;
              }
              case 'CHEQUE_WRITING_AND_FTS_SENT_DELTA_TIME':
              case 'FTS_SENT_AND_VALIDATION_DELTA_TIME':
              case 'FTS_VALIDATION_AND_PAYMENT_DELTA_TIME':
              case 'CHEQUE_WRITING_AND_PAYMENT_DELTA_TIME':
              case 'CHEQUE_WRITING_DURATION':
                this.form.addControl(
                  `${key}_from`,
                  new FormControl(this.filters[key].from, [])
                );
                this.form.addControl(
                  `${key}_to`,
                  new FormControl(this.filters[key].to, [])
                );
                break;
              default: {
                this.form.addControl(
                  `${key}_from`,
                  new FormControl(this.filters[key].from || null, [])
                );
                this.form.addControl(
                  `${key}_to`,
                  new FormControl(this.filters[key].to || null, [])
                );
                break;
              }
            }
            break;
          }
          case 'select': {
            this.form.addControl(
              `${key}`,
              new FormControl(this.filters[key].value[0] || null, [])
            );
            break;
          }
          default:
            break;
        }
      }
    });
  }

  private getPaymentSystemName(key: string): object {
    return map(
      this.filters[key].value,
      v =>
        find(paymentSystems, {
          code: findKey(PAYMENT_SYSTEMS, item => item === v)
        }).code
    );
  }

  obtainData() {}

  private checkFilterByKey(key) {
    if (isNil(this.filters[key])) {
      const filter = new Filter();
      Object.assign(this.filters, { [key]: filter });
    }
  }

  private validateYear() {
    if (!this.form) {
      return;
    }
    const valueFrom = this.f['YEAR_from'].value;
    const valueTo = this.f['YEAR_to'].value;
    if (isNilOrEmpty(valueFrom) || isNilOrEmpty(valueTo)) {
      this.clearOutOfRangeError('YEAR_to');
      return;
    }
    if (Number(valueFrom) > Number(valueTo)) {
      this.setOutOfRangeError('YEAR_to');
    } else {
      this.clearOutOfRangeError('YEAR_to');
    }
  }

  private setOutOfRangeError(key: string) {
    const errors = { ...this.f[key].errors };
    errors['outOfRange'] = true;
    this.f[key].setErrors({
      ...errors,
      outOfRange: true
    });
  }

  private clearOutOfRangeError(key: string) {
    let errors = { ...this.f[key].errors };
    if (errors.outOfRange) {
      delete errors.outOfRange;
    }
    if (Object.keys(errors).length === 0) {
      errors = null;
    }
    this.f[key].setErrors(errors);
  }

  private setNotFullPeriodError(key: string) {
    const errors = { ...this.f[key].errors };
    errors['notFullPeriod'] = true;
    this.f[key].setErrors({
      ...errors,
      notFullPeriod: true
    });
  }

  private clearNotFullPeriodError(key: string) {
    let errors = { ...this.f[key].errors };
    if (errors.notFullPeriod) {
      delete errors.notFullPeriod;
    }
    if (Object.keys(errors).length === 0) {
      errors = null;
    }
    this.f[key].setErrors(errors);
  }

  validateDay() {
    if (!this.form) {
      return;
    }
    const valueFrom = this.f['DAY_from'].value;
    const valueTo = this.f['DAY_to'].value;
    if (isNilOrEmpty(valueFrom) || isNilOrEmpty(valueTo)) {
      this.clearOutOfRangeError('DAY_to');
      return;
    }
    if (new Date(valueFrom).getTime() > new Date(valueTo).getTime()) {
      this.setOutOfRangeError('DAY_to');
    } else {
      this.clearOutOfRangeError('DAY_to');
    }
  }

  validateQuarter() {
    if (!this.form) {
      return;
    }
    const valueFromYear = this.f['QUARTER_from_y'].value;
    const valueToYear = this.f['QUARTER_to_y'].value;
    const valueFrom = this.f['QUARTER_from_q'].value;
    const valueTo = this.f['QUARTER_to_q'].value;
    const isDirty =
      this.f['QUARTER_from_y'].dirty ||
      this.f['QUARTER_to_y'].dirty ||
      this.f['QUARTER_from_q'].dirty ||
      this.f['QUARTER_to_q'].dirty;
    if (
      isNilOrEmpty(valueFrom) ||
      isNilOrEmpty(valueFromYear) ||
      isNilOrEmpty(valueTo) ||
      isNilOrEmpty(valueToYear)
    ) {
      this.clearOutOfRangeError('QUARTER_to_q');
      if (
        isDirty &&
        (!isNilOrEmpty(valueFrom) ||
          !isNilOrEmpty(valueFromYear) ||
          !isNilOrEmpty(valueTo) ||
          !isNilOrEmpty(valueToYear))
      ) {
        this.setNotFullPeriodError('QUARTER_to_q');
      } else {
        this.clearNotFullPeriodError('QUARTER_to_q');
      }
      return;
    }
    this.clearNotFullPeriodError('QUARTER_to_q');
    if (
      Number(valueFromYear) > Number(valueToYear) ||
      (Number(valueFromYear) === Number(valueToYear) &&
        this.compareQuarters(valueFrom, valueTo))
    ) {
      this.setOutOfRangeError('QUARTER_to_q');
    } else {
      this.clearOutOfRangeError('QUARTER_to_q');
    }
  }

  compareQuarters(from: string, to: string) {
    const fromN = from.substring(1);
    const toN = to.substring(1);
    return Number(fromN) > Number(toN);
  }

  validateMonth() {
    if (!this.form) {
      return;
    }
    const valueFromYear = this.f['MONTH_from_y'].value;
    const valueToYear = this.f['MONTH_to_y'].value;
    const valueFrom = this.f['MONTH_from_m'].value;
    const valueTo = this.f['MONTH_to_m'].value;
    const isDirty =
      this.f['MONTH_from_y'].dirty ||
      this.f['MONTH_to_y'].dirty ||
      this.f['MONTH_from_m'].dirty ||
      this.f['MONTH_to_m'].dirty;
    if (
      isNilOrEmpty(valueFrom) ||
      isNilOrEmpty(valueFromYear) ||
      isNilOrEmpty(valueTo) ||
      isNilOrEmpty(valueToYear)
    ) {
      this.clearOutOfRangeError('MONTH_to_m');
      if (
        isDirty &&
        (!isNilOrEmpty(valueFrom) ||
          !isNilOrEmpty(valueFromYear) ||
          !isNilOrEmpty(valueTo) ||
          !isNilOrEmpty(valueToYear))
      ) {
        this.setNotFullPeriodError('MONTH_to_m');
      } else {
        this.clearNotFullPeriodError('MONTH_to_m');
      }
      return;
    }
    this.clearNotFullPeriodError('MONTH_to_m');
    if (
      Number(valueFromYear) > Number(valueToYear) ||
      (Number(valueFromYear) === Number(valueToYear) &&
        Number(valueFrom) > Number(valueTo))
    ) {
      this.setOutOfRangeError('MONTH_to_m');
    } else {
      this.clearOutOfRangeError('MONTH_to_m');
    }
  }

  validateInterval(key: string) {
    if (!this.form) {
      return;
    }
    const valueFrom = !isNil(this.f[`${key}_from`].value)
      ? new Date(this.f[`${key}_from`].value).getTime()
      : null;
    const valueTo = !isNil(this.f[`${key}_to`].value)
      ? new Date(this.f[`${key}_to`].value).getTime()
      : null;
    if (isNilOrEmpty(valueFrom) || isNilOrEmpty(valueTo)) {
      this.clearOutOfRangeError(`${key}_to`);
      return;
    }
    if (valueFrom >= valueTo) {
      this.setOutOfRangeError(`${key}_to`);
    } else {
      this.clearOutOfRangeError(`${key}_to`);
    }
  }

  selectChange(val, key) {
    this.checkFilterByKey(key);
    if (!isNil(val)) {
      this.filters[key].value = [val];
    } else {
      delete this.filters[key];
    }
  }

  selectMultipleChange(val, key) {
    this.checkFilterByKey(key);
    this.filters[key].value = val.map(x => {
      switch (key) {
        case 'TRADING_ORGANIZATION':
          return { name: x.name, inn: x.inn, code: x.code };
        case 'PAYMENT_SYSTEM':
          return PAYMENT_SYSTEMS[x.code];
        case 'CURRENCY':
          return x.name;
        default:
          return x.code;
      }
    });
  }

  selectFromChange(val, key) {
    this.checkFilterByKey(key);
    switch (key) {
      case 'YEAR':
      case 'DAY': {
        this.filters[key].from = val;
        break;
      }
      case 'QUARTER': {
        const year = this.f[`${key}_from_y`].value;
        const q = this.f[`${key}_from_q`].value;
        let value = '';
        if (!isNil(year)) {
          value += year;
        }
        if (!isNil(q)) {
          value += `-${q}`;
        }
        this.filters[key].from = value;
        break;
      }
      case 'MONTH': {
        const year = this.f[`${key}_from_y`].value;
        const m = this.f[`${key}_from_m`].value;
        let value = '';
        if (!isNil(year)) {
          value += year;
        }
        if (!isNil(m)) {
          value += `-${m}`;
        }
        this.filters[key].from = value;
        break;
      }
      case 'CHEQUE_WRITING_AND_FTS_SENT_DELTA_TIME':
      case 'FTS_SENT_AND_VALIDATION_DELTA_TIME':
      case 'FTS_VALIDATION_AND_PAYMENT_DELTA_TIME':
      case 'CHEQUE_WRITING_AND_PAYMENT_DELTA_TIME':
      case 'CHEQUE_WRITING_DURATION': {
        this.f[`${key}_from`].setValue(val);
        this.filters[key].from = val;
        break;
      }
    }
  }

  selectToChange(val, key) {
    this.checkFilterByKey(key);
    switch (key) {
      case 'YEAR':
      case 'DAY': {
        this.filters[key].to = val;
        break;
      }
      case 'QUARTER': {
        const year = this.f[`${key}_to_y`].value;
        const q = this.f[`${key}_to_q`].value;
        let value = '';
        if (!isNil(year)) {
          value += year;
        }
        if (!isNil(q)) {
          value += `-${q}`;
        }
        this.filters[key].to = value;
        break;
      }
      case 'MONTH': {
        const year = this.f[`${key}_to_y`].value;
        const m = this.f[`${key}_to_m`].value;
        let value = '';
        if (!isNil(year)) {
          value += year;
        }
        if (!isNil(m)) {
          value += `-${m}`;
        }
        this.filters[key].to = value;
        break;
      }
      case 'CHEQUE_WRITING_AND_FTS_SENT_DELTA_TIME':
      case 'FTS_SENT_AND_VALIDATION_DELTA_TIME':
      case 'FTS_VALIDATION_AND_PAYMENT_DELTA_TIME':
      case 'CHEQUE_WRITING_AND_PAYMENT_DELTA_TIME':
      case 'CHEQUE_WRITING_DURATION': {
        this.f[`${key}_to`].setValue(val);
        this.filters[key].to = val;
        break;
      }
    }
  }

  dateFromChange(val, key) {
    this.checkFilterByKey(key);
    this.filters[key].from = moment(val).format('YYYY-MM-DD');
  }

  dateToChange(val, key) {
    this.checkFilterByKey(key);
    this.filters[key].to = moment(val).format('YYYY-MM-DD');
  }

  initSections() {
    switch (this.reportType) {
      case 'tax-free-cheque': {
        this.reportSections = reportOneSections;
        break;
      }
      case 'commodity': {
        this.reportSections = reportTwoSections;
        break;
      }
      case 'user': {
        this.reportSections = reportThreeSections;
        break;
      }
      default:
        break;
    }
  }

  close(): void {
    this.modalService.dismissAll();
  }

  getFilterName(key: string) {
    return FiltersName.get(key);
  }

  getFilterType(key: string) {
    const section = find(
      this.reportSections,
      r => r.code === key
    ) as ReportFilterSection;
    return section.type;
  }

  getSelectOptions(key: string) {
    switch (key) {
      case 'CHEQUE_WRITING_TYPE':
        return registrationMethod;
      case 'INPUT_METHOD':
        return inputMethod;
      case 'CHEQUE_STATUS':
        return reportsChequeStatuses;
      case 'TRADING_ORGANIZATION':
        return this.ort;
      case 'NAME':
        return this.comodities;
      case 'COUNTRY':
      case 'CITIZENSHIP':
        return this.countries;
      case 'CURRENCY':
        return this.currencies;
      case 'PAYMENT_SYSTEM':
        return paymentSystems;
      case 'FISCAL_DATA_SOURCE':
        return fiscalSource;
      case 'YEAR':
        return this.years;
      case 'QUARTER':
        return quarters;
      case 'MONTH':
        return months;
      case 'ACTUAL_VERSION':
        return actualitysSource;
      default:
        return [];
    }
  }

  loadCountries() {
    this.dictionaryService.obtainCountry().subscribe(result => {
      this.countries = map(result, r => {
        return {
          code: r.code,
          name: r.codeAlpha3
        };
      });
      this.countries = this.sortByAlphabet(this.countries);
    });
  }

  loadCurrencies() {
    this.dictionaryService.obtainCurrency().subscribe(result => {
      this.currencies = map(result, r => {
        return {
          code: r.letterCode,
          name: r.letterCode
        };
      });
      this.currencies = this.sortByAlphabet(this.currencies);
    });
  }

  loadOrt() {
    this.dictionaryService.obtainOrganizations().subscribe(
      result => {
        this.ort = this.sortByAlphabet(result);
      },
      error => (this.ort = [{ code: null, name: null }])
    );
  }

  loadComodities() {
    this.reportService
      .getCommoditiesList()
      .subscribe(
        res =>
          (this.comodities = this.sortByAlphabet(
            map(res, (item, index) => ({ name: item, code: index }))
          ))
      );
  }

  getYears() {
    const currentYear = new Date().getFullYear();
    for (let i = this.startYear; i <= currentYear; i++) {
      this.years.push({
        code: i.toString(),
        name: i.toString()
      });
    }
    return this.years;
  }

  reset(key: string, subKey?: string) {
    this.f[key + (subKey ? `_${subKey}` : '')].setValue(null);
    if (subKey) {
      this.filters[key][subKey] = null;
    }
  }

  resetAll() {
    forEach(keys(this.f), key => {
      this.f[key].setValue(null);
    });

    this.filters = {};
    this.filtersResetNoty = true;
    setTimeout(() => {
      this.filtersResetNoty = false;
    }, 2500);
  }

  saveChanges() {
    let copyFilters = cloneDeep(this.filters);
    forEach(keys(this.filters), key => {
      if (
        isEmpty(this.filters[key].value) &&
        isNil(this.filters[key].from) &&
        isNil(this.filters[key].to)
      ) {
        copyFilters = omit(copyFilters, key);
      }
    });
    this.filters = copyFilters;
    this.reportService.storeFilters(this.filters, this.reportType);
    this.activeFiltersCounter();
    this.close();
  }

  activeFiltersCounter() {
    forEach(keys(this.filters), key => {
      if (
        this.filters[key].from ||
        this.filters[key].to ||
        this.filters[key].value.length > 0
      ) {
        this.filtersCount++;
      }
    });
    this.filtersCountOutput.emit(this.filtersCount);
  }
  sortByAlphabet(arr) {
    return arr.sort((a, b) => {
      if (a.name > b.name) {
        return 1;
      }
      if (a.name < b.name) {
        return -1;
      }
      return 0;
    });
  }
}
