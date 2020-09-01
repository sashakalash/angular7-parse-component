import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { AbstractFormComponent } from 'src/app/core/classes';
import { ReportTableEvent } from 'src/app/core/models/events';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-report-admin',
  templateUrl: './report-admin.component.html',
  styleUrls: ['./report-admin.component.scss']
})
export class ReportAdminComponent extends AbstractFormComponent
  implements OnInit {
  hideBreadCrumbs;
  obtaining = false;
  @ViewChild('reportTable') reportTable;

  constructor(private modalService: NgbModal) {
    super();
  }

  ngOnInit() {}

  obtainData() {}

  onResize() {}

  loadReport(event: ReportTableEvent) {
    this.reportTable.loadReport(event);
  }

  clearErrorMess(): void {
    this.reportTable.clearErrorMess();
  }

  clearTable(): void {
    this.reportTable.clearTable();
  }
}
