import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from 'src/app/core/guards/auth.guard';
import { ReportAdminComponent } from './pages/report-admin.component';
import { REPORT_ADMIN } from '../../core';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        canActivate: [AuthGuard],
        data: {
          title: 'Reports',
          allowedRoles: [REPORT_ADMIN]
        },
        children: [
          {
            path: '',
            component: ReportAdminComponent
          }
        ]
      }
    ]
  }
];
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReportAdminRoutingModule {}
