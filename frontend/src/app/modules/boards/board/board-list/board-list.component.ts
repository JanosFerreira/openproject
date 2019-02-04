import {Component, ElementRef, Input, OnDestroy, OnInit, Query, ViewChild} from "@angular/core";
import {QueryDmService} from "core-app/modules/hal/dm-services/query-dm.service";
import {
  LoadingIndicatorService,
  withLoadingIndicator
} from "core-app/modules/common/loading-indicator/loading-indicator.service";
import {QueryResource} from "core-app/modules/hal/resources/query-resource";
import {WorkPackageTableConfigurationObject} from "core-components/wp-table/wp-table-configuration";
import {Observable, of, Subject} from "rxjs";
import {HalResource} from "core-app/modules/hal/resources/hal-resource";
import {auditTime, debounce, debounceTime, distinctUntilChanged, share, tap, withLatestFrom} from "rxjs/operators";
import {untilComponentDestroyed} from "ng2-rx-componentdestroyed";
import {WorkPackageInlineCreateService} from "core-components/wp-inline-create/wp-inline-create.service";
import {WpChildrenInlineCreateService} from "core-components/wp-relations/embedded/children/wp-children-inline-create.service";
import {BoardInlineCreateService} from "core-app/modules/boards/board/board-list/board-inline-create.service";

@Component({
  selector: 'board-list',
  templateUrl: './board-list.component.html',
  styleUrls: ['./board-list.component.sass'],
  providers: [
    { provide: WorkPackageInlineCreateService, useClass: BoardInlineCreateService }
  ]
})
export class BoardListComponent implements OnInit, OnDestroy {
  @Input() queryInput:number|QueryResource;

  @ViewChild('loadingIndicator') indicator:ElementRef;

  /** The query resource being loaded */
  public query$:Observable<QueryResource>;


  /** Rename events */
  public rename$ = new Subject<string>();

  constructor(private readonly QueryDm:QueryDmService,
              private readonly loadingIndicator:LoadingIndicatorService) {
  }

  ngOnInit():void {
    if (this.queryInput instanceof HalResource) {
      this.query$ = of(this.queryInput);
      return;
    }

    this.query$ = this.QueryDm
      .stream(this.columnsQueryProps, this.queryInput)
      .pipe(
        withLoadingIndicator(this.indicatorInstance, 50),
        share()
      );

    this.rename$
      .pipe(
        untilComponentDestroyed(this),
        debounceTime(1000),
        distinctUntilChanged(),
        withLatestFrom(this.query$)
      )
      .subscribe(([newName, query]) => {
        query.name = newName;
        this.QueryDm.patch(query.id, { name: newName });
      });
  }

  ngOnDestroy():void {
    // Interface compatibility
  }

  get columnsQueryProps() {
    return {
      'columns[]': ['id', 'subject'],
      'showHierarchies': false,
      'pageSize': 500,
    };
  }

  get boardTableConfiguration():WorkPackageTableConfigurationObject {
    return {
      hierarchyToggleEnabled: false,
      columnMenuEnabled: false,
      actionsColumnEnabled: false,
      dragAndDropEnabled: true,
      isEmbedded: true,
      isCardView: false
    };
  }

  private get indicatorInstance() {
    return this.loadingIndicator.indicator(jQuery(this.indicator.nativeElement));
  }
}
