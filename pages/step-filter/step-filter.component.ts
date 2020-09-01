import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  Input,
  OnChanges
} from '@angular/core';
import { AbstractFormComponent } from 'src/app/core/classes';
import { FormBuilder } from '@angular/forms';
import { isNil, forEach, keys } from 'lodash';

@Component({
  selector: 'app-step-filter',
  templateUrl: './step-filter.component.html',
  styleUrls: ['./step-filter.component.scss']
})
export class StepFilterComponent extends AbstractFormComponent
  implements OnInit {
  @Input() showLabels: boolean;
  @Input() direction: string;
  @Input() values: string;
  @Input() class: { [key: string]: boolean };
  @Output() setStep: EventEmitter<any> = new EventEmitter();

  constructor(protected formBuilder: FormBuilder) {
    super();
  }

  ngOnInit() {
    this.form = this.formBuilder.group({
      days: [null],
      hours: [null],
      minutes: [null],
      seconds: [null],
      firstStep: [null]
    });
    this.obtainData();
  }

  obtainData() {
    if (!isNil(this.values)) {
      this.obtainValues(this.values);
    }
  }

  obtainValues(value) {
    const days = Math.floor(value / 86400000);
    const hours = Math.floor((value - days * 86400000) / 3600000);
    const minutes = Math.floor(
      (value - days * 86400000 - hours * 3600000) / 60000
    );
    const seconds = Math.floor(
      (value - days * 86400000 - hours * 3600000 - minutes * 60000) / 1000
    );
    this.f.days.setValue(days !== 0 ? days : null);
    this.f.hours.setValue(hours !== 0 ? hours : null);
    this.f.minutes.setValue(minutes !== 0 ? minutes : null);
    this.f.seconds.setValue(seconds !== 0 ? seconds : null);
  }

  onInput(e, flag) {
    const value =
      +e.target.value > +e.target.max ? +e.target.max : +e.target.value;
    this.f[flag].setValue(value !== 0 ? value : null);
    const step =
      this.f.days.value * 24 * 60 * 60 * 1000 +
      this.f.hours.value * 60 * 60 * 1000 +
      this.f.minutes.value * 60 * 1000 +
      this.f.seconds.value * 1000;
    this.setStep.emit(step);
  }
}
