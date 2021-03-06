/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AutocompleteSuggestion } from 'ui/autocomplete_providers';
import 'ui/autoload/all';
// @ts-ignore: path dynamic for kibana
import { management } from 'ui/management';
// @ts-ignore: path dynamic for kibana
import { uiModules } from 'ui/modules';
// @ts-ignore: path dynamic for kibana
import routes from 'ui/routes';
import { getSupportedConfig } from '../../config_schemas_translations_map';
// @ts-ignore: path dynamic for kibana
import { MemoryBeatsAdapter } from '../adapters/beats/memory_beats_adapter';
import { KibanaFrameworkAdapter } from '../adapters/framework/kibana_framework_adapter';
import { MemoryTagsAdapter } from '../adapters/tags/memory_tags_adapter';
import { MemoryTokensAdapter } from '../adapters/tokens/memory_tokens_adapter';
import { BeatsLib } from '../beats';
import { FrameworkLib } from '../framework';
import { TagsLib } from '../tags';
import { FrontendLibs } from '../types';
import { MemoryElasticsearchAdapter } from './../adapters/elasticsearch/memory';
import { ElasticsearchLib } from './../elasticsearch';

const onKibanaReady = uiModules.get('kibana').run;

export function compose(
  mockIsKueryValid: (kuery: string) => boolean,
  mockKueryToEsQuery: (kuery: string) => string,
  suggestions: AutocompleteSuggestion[]
): FrontendLibs {
  const esAdapter = new MemoryElasticsearchAdapter(
    mockIsKueryValid,
    mockKueryToEsQuery,
    suggestions
  );
  const tags = new TagsLib(new MemoryTagsAdapter([]), getSupportedConfig());
  const tokens = new MemoryTokensAdapter();
  const beats = new BeatsLib(new MemoryBeatsAdapter([]), { tags });

  const pluginUIModule = uiModules.get('app/beats_management');

  const framework = new FrameworkLib(
    new KibanaFrameworkAdapter(
      pluginUIModule,
      management,
      routes,
      () => '',
      onKibanaReady,
      null,
      null
    )
  );
  const libs: FrontendLibs = {
    framework,
    elasticsearch: new ElasticsearchLib(esAdapter),
    tags,
    tokens,
    beats,
  };
  return libs;
}
