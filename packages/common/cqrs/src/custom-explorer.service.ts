import { Injectable, Type } from '@nestjs/common';
import { IEvent } from '@nestjs/cqrs';
import { ModulesContainer } from '@nestjs/core/injector/modules-container';
import { ExplorerService } from '@nestjs/cqrs/dist/services/explorer.service';
import { CqrsOptions } from '@nestjs/cqrs/dist/interfaces/cqrs-options.interface';
import { SYNC_SAGA_METADATA } from './constants';

export interface IExtendedOptions extends CqrsOptions {
  syncSagas?: Type<any>[];
}

@Injectable()
export class CustomExplorerService<EventBase extends IEvent = IEvent> extends ExplorerService<EventBase> {
  private customModulesContainer: ModulesContainer;

  constructor(modulesContainer: ModulesContainer) {
    super(modulesContainer);
    this.customModulesContainer = modulesContainer;
  }

  explore(): IExtendedOptions {
    const baseOptions = super.explore();

    const modules = [...this.customModulesContainer.values()];
    const syncSagas = this.flatMap(modules, (instance) => this.filterProvider(instance, SYNC_SAGA_METADATA));

    return { ...baseOptions, syncSagas };
  }
}
