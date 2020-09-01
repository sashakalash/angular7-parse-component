import { Component, OnDestroy, OnInit } from '@angular/core';
import { NumberFormatPipe } from 'src/app/core/pipes/number-format.pipe';
import {
  ReportForTable,
  ReportHeader
} from 'src/app/core/models/Report/Report';
import { ReportTableEvent } from 'src/app/core/models/events';
import { ReportService } from 'src/app/core/services/report.service';
import {
  filter,
  find,
  forEach,
  isEmpty,
  isNil,
  map,
  max,
  maxBy,
  min,
  minBy
} from 'lodash';
import { TradingNetwork, TradingOrganization } from 'src/app/core/models';
import {
  actualitysSource,
  inputMethod,
  LONG_HANDLING_TEXT,
  registrationMethod,
  reportOneIndexes,
  reportOneSections,
  reportsChequeStatuses,
  reportThreeIndexes,
  reportThreeSections,
  reportTwoIndexes,
  reportTwoSections
} from 'src/app/core/constants';
import { CurrenciesService, DictionaryService } from 'src/app/core/services';
import { isUndefined } from 'util';
import { ORDERED_PAYMENT_SYSTEMS } from 'src/app/core/constants';

const regEx = new RegExp(/\d{4}-Q\d{1}/);
const BOM = '\uFEFF';

const isNilOrUndefined = value => isNil(value) || isUndefined(value);

@Component({
  selector: 'app-report-table',
  templateUrl: './report-table.component.html',
  styleUrls: ['./report-table.component.scss'],
  providers: [NumberFormatPipe],

  host: { '(window:resize)': 'onResize()' }
})
export class ReportTableComponent implements OnInit, OnDestroy {
  reportForTable: ReportForTable;
  obtaining = false;
  reportFilters;
  p;
  timer: any;
  longRequestText = LONG_HANDLING_TEXT;
  showTimerMessage: boolean;
  backendError: string;
  names = [];
  countries = [];
  tradeNetworks: TradingNetwork[];
  tradeOrganizations: TradingOrganization[];
  totalPages: number;

  constructor(
    private reportService: ReportService,
    public format: NumberFormatPipe,
    private dictionaryService: DictionaryService,
    private currencyService: CurrenciesService
  ) { }

  ngOnInit() {
    this.loadCountrysList();
    this.loadTradeOrgList();
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  private getAlphabetOrderList(list, measure?) {
    return list.sort((a, b) => {
      const touchstoneA = measure ? a[measure] : a;
      const touchstoneB = measure ? b[measure] : b;
      if (touchstoneA > touchstoneB) {
        return 1;
      }
      if (touchstoneA < touchstoneB) {
        return -1;
      }
      return 0;
    });
  }

  private sortStepsList(list) {
    return list.sort((a, b) => {
      if (+a > +b) {
        return 1;
      }
      if (+a < +b) {
        return -1;
      }
      return 0;
    });
  }

  private fillFirstYearQuarters(quarter, year) {
    const result = [];
    for (let i = 0; i < 5 - quarter; i++) {
      result.push(`${quarter + i} кв. ${year}`);
    }
    return result;
  }

  private fillLastYearQuarters(quarter, year) {
    const result = [];
    for (let i = 1; i <= quarter; i++) {
      result.push(`${i} кв. ${year}`);
    }
    return result;
  }

  private fillMIddleYearsQuarters(firstYear, lastYear) {
    const result = [];
    let y = +firstYear + 1;
    while (y < lastYear) {
      for (let i = 1; i <= 4; i++) {
        result.push(`${i} кв. ${y}`);
      }
      y++;
    }
    return result;
  }

  private convertQuarterName(quarter) {
    const ar = quarter.split('-');
    return `${ar[1].substring(ar[1].length - 1)} кв. ${ar[0]}`;
  }

  getActionFunc(period, type) {
    switch (period) {
      case 'YEAR':
        return (d, v?) => d[`${type}FullYear`](v);
      case 'MONTH':
        return (d, v?) => d[`${type}Month`](v);
      case 'DAY':
        return (d, v?) => d[`${type}Date`](v);
    }
  }

  private fillPeriod(data, period, type?) {
    if (isEmpty(data)) {
      return data;
    }
    const convertData = map(data, d => {
      if (d[period]) {
        d[period] = new Date(d[period]).getTime();
      } else {
        d = new Date(d).getTime();
      }
      return d;
    });
    let start =
      type === 'rows' ? minBy(convertData, period)[period] : min(convertData);
    const end =
      type === 'rows' ? maxBy(convertData, period)[period] : max(convertData);
    const allItems = [];
    const getAction = this.getActionFunc(period, 'get');
    const setAction = this.getActionFunc(period, 'set');
    while (start <= end) {
      const d = new Date(start);
      allItems.push(start);
      start = setAction(d, getAction(d) + 1);
    }
    return type === 'rows'
      ? allItems.map(res => {
        const s = find(convertData, i => i[period] === res);
        return s ? s : { [period]: res, COUNT: null };
      })
      : allItems;
  }

  private fillQuarters(data, type?) {
    if (isEmpty(data)) {
      return data;
    }
    const startItem =
      type === 'rows' ? minBy(data, 'QUARTER')['QUARTER'] : min(data);
    const endItem =
      type === 'rows' ? maxBy(data, 'QUARTER')['QUARTER'] : max(data);
    const startQ = +startItem.substring(startItem.length - 1);
    const endQ = +endItem.substring(startItem.length - 1);
    const startYear = +startItem.split('-')[0];
    const endYear = +endItem.split('-')[0];
    let convertData;
    if (type === 'rows') {
      convertData = forEach(
        data,
        d => (d['QUARTER'] = this.convertQuarterName(d['QUARTER']))
      );
    }
    let result;
    if (startYear === endYear) {
      result = this.fillFirstYearQuarters(startQ, startYear);
    } else {
      result = this.fillFirstYearQuarters(startQ, startYear)
        .concat(this.fillMIddleYearsQuarters(startYear, endYear))
        .concat(this.fillLastYearQuarters(endQ, endYear));
    }
    return type === 'rows'
      ? map(result, res => {
        const s = find(convertData, i => i['QUARTER'] === res);
        return s ? s : { QUARTER: res, COUNT: null };
      })
      : result;
  }

  private extendDates(data, flag: string, isHeader?: boolean) {
    if (isEmpty(data)) {
      return data;
    }
    if (isHeader) {
      const filteredData = filter(data, i =>
        flag === 'QUARTER' ? regEx.test(i) : new Date(i).getTime()
      );
      return flag === 'QUARTER'
        ? data.slice(0, 2).concat(this.fillQuarters(filteredData))
        : data.slice(0, 2).concat(this.fillPeriod(filteredData, flag));
    } else {
      return flag === 'QUARTER'
        ? this.fillQuarters(data, 'rows')
        : this.fillPeriod(data, flag, 'rows');
    }
  }

  private convertStep(value: string, step: number): string {
    if (!/(9{3})/.test(value)) {
      return value;
    }
    const newValue = +value;
    const fromStep = newValue + 1 - step;
    const toStep = newValue + 1;
    const fromDays = Math.floor(fromStep / 86400000);
    const toDays = Math.floor(toStep / 86400000);
    const fromHours = Math.floor((fromStep - fromDays * 86400000) / 3600000);
    const toHours = Math.floor((toStep - toDays * 86400000) / 3600000);
    const fromMinutes = Math.floor(
      (fromStep - fromDays * 86400000 - fromHours * 3600000) / 60000
    );
    const toMinutes = Math.floor(
      (toStep - toDays * 86400000 - toHours * 3600000) / 60000
    );
    const fromSeconds = Math.floor(
      (fromStep -
        fromDays * 86400000 -
        fromHours * 3600000 -
        fromMinutes * 60000) /
      1000
    );
    const toSeconds = Math.floor(
      (toStep - toDays * 86400000 - toHours * 3600000 - toMinutes * 60000) /
      1000
    );
    const from =
      (fromDays !== 0 ? fromDays + 'дн ' : '') +
      (fromHours !== 0 ? fromHours + 'ч ' : '') +
      (fromMinutes !== 0 ? fromMinutes + 'м ' : '') +
      (fromSeconds !== 0 ? fromSeconds + 'с ' : '');
    const to =
      (toDays !== 0 ? toDays + 'дн ' : '') +
      (toHours !== 0 ? toHours + 'ч ' : '') +
      (toMinutes !== 0 ? toMinutes + 'м ' : '') +
      (toSeconds !== 0 ? toSeconds + 'с ' : '');
    return `${from !== '' ? from : 0} - ${to}`;
  }

  private isSteps(name: string): boolean {
    return (
      name === 'CHEQUE_WRITING_AND_FTS_SENT_DELTA_TIME' ||
      name === 'FTS_SENT_AND_VALIDATION_DELTA_TIME' ||
      name === 'FTS_VALIDATION_AND_PAYMENT_DELTA_TIME' ||
      name === 'CHEQUE_WRITING_AND_PAYMENT_DELTA_TIME' ||
      name === 'CHEQUE_WRITING_DURATION' ||
      name === 'COUNT'
    );
  }

  private isPeriod(name: string): boolean {
    return (
      name === 'YEAR' ||
      name === 'QUARTER' ||
      name === 'MONTH' ||
      name === 'DAY'
    );
  }

  private getExtendedData(data, isHeader: boolean, section?: string) {
    return isHeader
      ? section && this.isPeriod(section)
        ? this.extendDates(data, section, isHeader)
        : data
      : (this.reportFilters.reportFirstSection &&
        this.isPeriod(this.reportFilters.reportFirstSection)) ||
        this.isPeriod(this.reportFilters.reportSecondSection)
        ? this.extendDates(data, section)
        : data;
  }

  private getRenamedOrts(data, isHeader: boolean) {
    if (isHeader) {
      return data.slice(0, 2).concat(
        map(data.slice(2), item => {
          const to = find(this.tradeOrganizations, { name: item });
          if (to && to.paymentAddress) {
            return `${to.name}, ${to.paymentAddress || ''}`;
          } else {
            return item;
          }
        })
      );
    } else {
      return map(data, item => {
        const to = find(this.tradeOrganizations, {
          name: item.TRADING_ORGANIZATION
        });
        if (to && to.paymentAddress) {
          item.TRADING_ORGANIZATION = `${to.name}, ${to.paymentAddress || ''}`;
          return item;
        } else {
          return item;
        }
      });
    }
  }

  private sortPaymentSystem(data) {
    return this.getAlphabetOrderList(map(data, item => {
      const ps = find(ORDERED_PAYMENT_SYSTEMS, i => i.value === item.PAYMENT_SYSTEM);
      item['order'] = ps ? ps.order : 0;
      return item;
    }), 'order');
  }

  private obtainRowsAndHeaders(data: any[], isHeader?: boolean): string[] {
    if (isEmpty(data)) {
      return data;
    }
    const typeOfCase = isHeader
      ? this.reportFilters.reportSecondSection
      : this.reportFilters.reportFirstSection;
    if (isEmpty(data) || isNil(typeOfCase)) {
      return data;
    }
    switch (typeOfCase) {
      case 'NAME':
        return this.reportFilters.reportType === 'commodity'
          ? this.getAlphabetOrderList(data, 'NAME')
          : data;
      case 'YEAR':
      case 'QUARTER':
      case 'MONTH':
      case 'DAY':
        return this.reportFilters.reportFirstSection
          ? this.getExtendedData(data, isHeader, typeOfCase)
          : data;
      case 'TRADING_ORGANIZATION':
        return this.getRenamedOrts(data, isHeader);
      case 'PAYMENT_SYSTEM':
        return this.sortPaymentSystem(data);
      default:
        return data;
    }
  }

  private getFormattedKeyName(name) {
    if (regEx.test(name)) {
      return this.convertQuarterName(name);
    }
    if (this.isSteps(this.reportFilters.reportSecondSection)) {
      return String(name);
    }
    if (new Date(name).getTime()) {
      return new Date(name).getTime();
    }
    return name;
  }

  private formatStatuses(item) {
    const status = find(
      reportsChequeStatuses,
      i => i.code === item['CHEQUE_STATUS']
    );
    item['orderId'] = status.orderId;
    return item;
  }

  private orderHeaderStatuses(data) {
    const statuses = map(data.slice(2), i =>
      find(reportsChequeStatuses, status => status.code === i)
    );
    const sortedStatuses = this.getAlphabetOrderList(statuses, 'orderId');
    return data.slice(0, 2).concat(map(sortedStatuses, 'code'));
  }

  loadReport(reportEvent: ReportTableEvent): void {
    this.obtaining = true;
    if (
      !(
        isNil(reportEvent.reportType) ||
        isNil(reportEvent.reportIndex) ||
        (isNil(reportEvent.reportFirstSection) &&
          isNil(reportEvent.reportSecondSection))
      )
    ) {
      reportEvent.filters = this.reportService.getFilters(
        reportEvent.reportType
      );
      this.reportFilters = reportEvent;
      this.timerStart();
      this.backendError = null;
      this.reportService
        .obtainReport(
          reportEvent.reportType,
          reportEvent.reportIndex,
          reportEvent.reportFirstSection,
          reportEvent.reportSecondSection,
          reportEvent.fromDate,
          reportEvent.toDate,
          reportEvent.filters,
          reportEvent.firstStep,
          reportEvent.secondStep
        )
        .subscribe(
          report => {
            const fullHeadersList = this.obtainRowsAndHeaders(
              report.headers,
              true
            );
            const rows = map(this.obtainRowsAndHeaders(report.rows), item =>
              this.formateRowData(item)
            );
            const newRows =
              reportEvent.reportFirstSection === 'CHEQUE_STATUS'
                ? this.getAlphabetOrderList(
                  map(rows, this.formatStatuses),
                  'orderId'
                )
                : rows;
            const headers =
              reportEvent.reportSecondSection === 'CHEQUE_STATUS'
                ? this.getAlphabetOrderList(
                  this.orderHeaderStatuses(fullHeadersList),
                  'orderId'
                )
                : fullHeadersList.length > 100
                  ? fullHeadersList.slice(0, 100)
                  : fullHeadersList;
            this.totalPages = fullHeadersList.length - 2;
            const reportHeaders = map(
              headers.slice(0, 2), h =>
              new ReportHeader(h, this.getDataCorrectName(h))
            ).concat(
              (this.isSteps(reportEvent.reportSecondSection)
                ? this.sortStepsList(headers.slice(2, headers.length))
                : headers.slice(2, headers.length))
                .map(header =>
                  new ReportHeader(header, this.getTableData(header)))
            );
            const rowsForTable = newRows.map(row => {
              const rowWithFormattedValues = {};
              Object.keys(row).forEach(key => {
                rowWithFormattedValues[key] = this.getTableData(row[key], key);
              });
              return rowWithFormattedValues;
            });

            this.reportForTable = new ReportForTable(
              reportHeaders,
              rowsForTable
            );
            this.obtaining = false;
            clearTimeout(this.timer);
          },
          error => {
            this.obtaining = false;
            clearTimeout(this.timer);
            if (error.error && error.error.message) {
              this.backendError = error.error.message;
            } else if (error.error) {
              this.backendError = 'При выполнении запроса возникла ошибка';
            }
          }
        );
    } else {
      this.obtaining = false;
      this.clearTable();
      clearTimeout(this.timer);
    }
  }

  clearTable(): void {
    this.reportForTable = null;
    this.totalPages = 0;
  }

  timerStart() {
    this.timer = setTimeout(() => {
      this.showTimerMessage = true;
    }, 15000);
    if (!this.obtaining) {
      clearTimeout(this.timer);
    }
  }

  download() {
    this.reportService
      .downloadCsv(
        this.reportFilters.reportType,
        this.reportFilters.reportIndex,
        this.reportFilters.reportFirstSection,
        this.reportFilters.reportSecondSection,
        this.reportFilters.fromDate,
        this.reportFilters.toDate,
        this.reportFilters.filters,
        /** TEMPORARY FIXED */
        0,
        1
      )
      .subscribe(response =>
        this.downLoadFile(response, 'text/csv;charset=utf-8;')
      );
  }

  downloadAllCommodities(): void {
    this.reportService.downloadAllCommodities().subscribe(response => {
      this.downLoadAllCommoditiesFile(response);
    });
  }

  downLoadFile(data: any, dataType: string) {
    const blob = new Blob([BOM, data], { type: dataType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'report.csv';
    link.click();
  }

  downLoadAllCommoditiesFile(data: any) {
    const blob = new Blob([data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'taxfreecheques.xls';
    link.click();
  }

  private getTagsHtml(tagName: keyof HTMLElementTagNameMap): string {
    const htmlStr: string[] = [];
    const elements = document.getElementsByTagName(tagName);
    for (const idx in elements) {
      if (elements.hasOwnProperty(idx)) {
        htmlStr.push(elements[idx].outerHTML);
      }
    }
    return htmlStr.join('\r\n');
  }

  printData() {
    const stylesHtml = this.getTagsHtml('style');
    const linksHtml = this.getTagsHtml('link');
    const divToPrint = document.getElementById('printTable');
    const newWin = window.open(
      '',
      '_blank',
      'top=0,left=0,height=100%,width=auto'
    );
    const html = `
      <html>
        <head>
          ${linksHtml}
          ${stylesHtml}
        </head>
        <body onload="window.print(); window.close()">${divToPrint.outerHTML}
      </html>
    `;
    newWin.document.write(html);
    newWin.print();
    setTimeout(() => newWin.close(), 150);
  }

  onResize() { }

  private formatValue(value: number): number {
    return +value.toFixed(2);
  }

  loadCountrysList() {
    this.dictionaryService.obtainCountry().subscribe(result => {
      this.countries = map(result, r => {
        return {
          code: r.code,
          name: r.codeAlpha3
        };
      });
    });
  }

  loadTradeOrgList() {
    this.reportService
      .getTradingOrganizationList()
      .subscribe(res => (this.tradeOrganizations = res));
  }

  getDataCorrectName(header: any, isHeader?: boolean): string {
    let names;
    switch (this.reportFilters.reportType) {
      case 'tax-free-cheque':
        names = reportOneIndexes
          .concat(reportOneSections)
          .concat(reportsChequeStatuses)
          .concat(registrationMethod)
          .concat(actualitysSource)
          .concat(this.countries);
        break;
      case 'commodity':
        names = reportTwoIndexes
          .concat(reportTwoSections)
          .concat(reportsChequeStatuses)
          .concat(inputMethod);
        break;
      case 'user':
        names = reportThreeIndexes
          .concat(reportThreeSections)
          .concat(this.countries);
        break;
    }
    const headerObj = names.find(item => item.code === header);
    if (headerObj) {
      return headerObj.name;
    } else if (
      (this.reportFilters.firstStep || this.reportFilters.secondStep) &&
      typeof header === 'string'
    ) {
      return this.convertStep(
        header,
        isHeader ? this.reportFilters.secondStep : this.reportFilters.firstStep
      );
    } else {
      return header;
    }
  }

  private formateRowData(item) {
    for (const key in item) {
      if (item.hasOwnProperty(key)) {
        const formattedKey = this.getFormattedKeyName(key);
        if (formattedKey !== key) {
          item[formattedKey] = item[key];
          // delete item[key];
        }
      }
    }
    return item;
  }

  private formatDate(date: string, period): string {
    let opts;
    switch (period) {
      case 'DAY':
        opts = { day: 'numeric', month: 'numeric', year: 'numeric' };
        break;
      case 'MONTH':
        opts = { month: 'numeric', year: 'numeric' };
        break;
      case 'YEAR':
        opts = { year: 'numeric' };
        break;
    }
    return opts ? new Date(date).toLocaleString('ru', opts) : date;
  }

  private formatData(data: string, headerName?: string): string {
    if (isNil(data)) {
      return data;
    }
    if (this.isPeriod(this.reportFilters.reportFirstSection) && headerName) {
      return this.formatDate(data, this.reportFilters.reportFirstSection);
    } else if (this.isPeriod(this.reportFilters.reportSecondSection)) {
      return this.formatDate(data, this.reportFilters.reportSecondSection);
    } else {
      return data;
    }
  }

  getTableData(data, headerName?) {
    let res;
    if (headerName) {
      if (this.isPeriod(headerName)) {
        res = this.formatDate(data, headerName);
      } else {
        res = this.getDataCorrectName(
          !isNil(data) && typeof data === 'number'
            ? this.formatValue(data)
            : headerName !== 'TRADING_ORGANIZATION' && !this.isSteps(headerName)
              ? this.formatData(data)
              : data
        );
      }
    } else {
      res = this.getDataCorrectName(
        !isNil(data) && typeof data === 'number' && !new Date(data).getTime()
          ? this.formatValue(data)
          : this.formatData(data, headerName),
        true
      );
    }
    return isNilOrUndefined(res) ? 'Нет данных' : res;
  }

  clearErrorMess() {
    this.backendError = '';
  }
}
