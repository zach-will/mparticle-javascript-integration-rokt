//  Copyright 2025 mParticle, Inc.
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.

// ============================================================
// Types
// ============================================================

import { Batch, KitInterface, IMParticleUser, SDKEvent } from '@mparticle/web-sdk/internal';
// BaseEvent not re-exported from @mparticle/web-sdk/internal, so we import directly from @mparticle/event-models.
import { BaseEvent } from '@mparticle/event-models';

interface RoktKitSettings {
  accountId: string;
  roktExtensions?: string;
  placementEventMapping?: string;
  placementEventAttributeMapping?: string;
  hashedEmailUserIdentityType?: string;
  onboardingExpProvider?: string;
  loggingUrl?: string;
  errorUrl?: string;
  isLoggingEnabled?: string | boolean;
}

interface EventAttributeCondition {
  operator: string;
  attributeValue: string;
}

interface PlacementEventRule {
  eventAttributeKey: string;
  conditions: EventAttributeCondition[];
}

interface EventAttributeMapping {
  value: string;
  map: string;
  conditions?: EventAttributeCondition[];
}

interface PlacementEventMappingEntry {
  jsmap: string;
  value: string;
}

interface RoktExtensionEntry {
  value: string;
}

interface RoktSelection {
  context?: {
    sessionId?: Promise<string>;
  };
  then?: (callback: (sel: RoktSelection) => void) => Promise<void>;
  catch?: (callback: () => void) => void;
}

interface RoktLauncher {
  selectPlacements(options: Record<string, unknown>): RoktSelection | Promise<RoktSelection>;
  hashAttributes(attributes: Record<string, unknown>): Promise<Record<string, unknown>>;
  use(extensionName: string): Promise<unknown>;
}

interface RoktGlobal {
  createLauncher(options: Record<string, unknown>): Promise<RoktLauncher>;
  createLocalLauncher(options: Record<string, unknown>): RoktLauncher;
  currentLauncher?: RoktLauncher;
  __batch_stream__?(batch: Batch): void;
  setExtensionData(data: Record<string, unknown>): void;
  use(value: string): void;
}

// TODO: getMPID and getUserIdentities exist on the User base type but are not re-exported from
// @mparticle/web-sdk/internal, so we redeclare them here until the internal types expose them.
interface FilteredUser extends IMParticleUser {
  getMPID(): string;
  getUserIdentities?: () => { userIdentities: Record<string, string> };
}

interface KitFilters {
  userAttributeFilters?: string[];
  filterUserAttributes?: (attributes: Record<string, unknown>, filters?: string[]) => Record<string, unknown>;
  filteredUser?: FilteredUser | null;
}

interface RoktManager {
  attachKit(kit: RoktKit): void | Promise<void>;
  filters?: KitFilters;
  domain?: string;
  launcherOptions?: Record<string, unknown>;
  getLocalSessionAttributes?(): Record<string, unknown>;
  setLocalSessionAttribute?(key: string, value: unknown): void;
}

interface MParticleInstance {
  setIntegrationAttribute(moduleId: number, attrs: Record<string, unknown>): void;
}

interface OptimizelyState {
  getActiveExperimentIds(): string[];
  getVariationMap(): Record<string, { id: string }>;
}

interface OptimizelyGlobal {
  get(key: 'state'): OptimizelyState;
}

// Our view of the mParticle global with Rokt-specific extensions.
// We access window.mParticle via an explicit cast (see `mp()` helper below)
// rather than augmenting Window to avoid conflicts with @mparticle/web-sdk declarations.
interface MParticleExtended {
  Rokt: RoktManager;
  addForwarder(config: ForwarderRegistration): void;
  getVersion(): string;
  generateHash(value: string): string | number;
  logEvent(name: string, type: number, attrs?: Record<string, unknown>): void;
  EventType: { Other: number };
  getInstance(): MParticleInstance;
  sessionManager?: { getSession(): string };
  _getActiveForwarders(): Array<{ name: string }>;
  config?: { isLocalLauncherEnabled?: boolean };
  captureTiming?(metricName: string): void;
  forwarder?: RoktKit;
  loggedEvents?: Array<Record<string, unknown>>;
  _registerErrorReportingService?(service: ErrorReportingService): void;
  _registerLoggingService?(service: LoggingService): void;
}

interface TestHelpers {
  generateLauncherScript: (domain: string | undefined, extensions: string[]) => string;
  generateThankYouElementScript: (domain: string | undefined) => string;
  extractRoktExtensionConfig: (settingsString?: string) => RoktExtensionConfig;
  hashEventMessage: (messageType: number, eventType: number, eventName: string) => string | number;
  parseSettingsString: <T>(settingsString?: string) => T[];
  generateMappedEventLookup: (placementEventMapping: PlacementEventMappingEntry[]) => Record<string, string>;
  generateMappedEventAttributeLookup: (mapping: EventAttributeMapping[]) => Record<string, PlacementEventRule[]>;
  sendAdBlockMeasurementSignals: (domain: string | undefined, version: string | null) => void;
  createAutoRemovedIframe: (src: string) => void;
  djb2: (str: string) => number;
  setAllowedOriginHashes: (hashes: number[]) => void;
  ReportingTransport: typeof ReportingTransport;
  ErrorReportingService: typeof ErrorReportingService;
  LoggingService: typeof LoggingService;
  RateLimiter: typeof RateLimiter;
  ErrorCodes: typeof ErrorCodes;
  WSDKErrorSeverity: typeof WSDKErrorSeverity;
}

interface ForwarderRegistration {
  name: string;
  constructor: new () => RoktKit;
  getId: () => number;
}

interface ReportingConfig {
  loggingUrl?: string;
  errorUrl?: string;
  isLoggingEnabled?: boolean | string;
}

interface ErrorReport {
  message: string;
  code?: string;
  severity?: string;
  stackTrace?: string;
}

interface LogEntry {
  message: string;
  code?: string;
}

interface RoktExtensionConfig {
  roktExtensionsQueryParams: string[];
  legacyRoktExtensions: string[];
  loadThankYouElement: boolean;
}

declare global {
  interface Window {
    Rokt?: RoktGlobal;
    __rokt_li_guid__?: string;
    optimizely?: OptimizelyGlobal;
    ROKT_DOMAIN?: string;
    // mParticle is declared as any to avoid conflicts with @mparticle/web-sdk type declarations.
    // We use the typed mp() accessor for all internal accesses.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mParticle: any;
  }
}

// ============================================================
// Module-level constants
// ============================================================

const name = 'Rokt';
const moduleId = 181;
const EVENT_NAME_SELECT_PLACEMENTS = 'selectPlacements';
const ADBLOCK_CONTROL_DOMAIN = 'apps.roktecommerce.com';
const INIT_LOG_SAMPLING_RATE = 0.1;
const ROKT_IDENTITY_EVENT_TYPE = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  MODIFY_USER: 'modify_user',
  IDENTIFY: 'identify',
} as const;
const ROKT_THANK_YOU_JOURNEY_EXTENSION = 'ThankYouJourney';
const ROKT_INTEGRATION_SCRIPT_ID = 'rokt-launcher';
const ROKT_THANK_YOU_ELEMENT_SCRIPT_ID = 'rokt-thank-you-element';

type RoktIdentityEventType = (typeof ROKT_IDENTITY_EVENT_TYPE)[keyof typeof ROKT_IDENTITY_EVENT_TYPE];

// ============================================================
// Reporting service constants
// ============================================================

const ErrorCodes = {
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  UNHANDLED_EXCEPTION: 'UNHANDLED_EXCEPTION',
  IDENTITY_REQUEST: 'IDENTITY_REQUEST',
} as const;

const WSDKErrorSeverity = {
  ERROR: 'ERROR',
  INFO: 'INFO',
  WARNING: 'WARNING',
} as const;

const DEFAULT_LOGGING_URL = 'apps.rokt-api.com/v1/log';
const DEFAULT_ERROR_URL = 'apps.rokt-api.com/v1/errors';
const RATE_LIMIT_PER_SEVERITY = 10;

// ============================================================
// Helper: typed accessor for window.mParticle
// We use an explicit cast here to avoid conflicts with @mparticle/web-sdk
// type declarations while still providing full type safety for our usages.
// ============================================================

function mp(): MParticleExtended {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).mParticle as MParticleExtended;
}

// ============================================================
// Module-level utility functions
// ============================================================

function generateLauncherScript(domain: string | undefined, extensions: string[]): string {
  const launcherPath = '/wsdk/integrations/launcher.js';
  const baseUrl = [generateBaseUrl(domain), launcherPath].join('');

  if (!extensions || extensions.length === 0) {
    return baseUrl;
  }
  return baseUrl + '?extensions=' + extensions.join(',');
}

function generateThankYouElementScript(domain: string | undefined) {
  const thankYouElementPath = '/rokt-elements/rokt-element-thank-you.js';
  return [generateBaseUrl(domain), thankYouElementPath].join('');
}

function generateBaseUrl(domain: string | undefined) {
  const resolvedDomain = typeof domain !== 'undefined' ? domain : 'apps.rokt-api.com';
  const protocol = 'https://';

  return [protocol, resolvedDomain].join('');
}

function loadRoktScript(
  scriptId: string,
  source: string,
  handlers?: { onLoad?: () => void; onError?: (e: Event | string) => void },
): void {
  if (document.getElementById(scriptId)) return; // resolves the preexisting script issue

  const target = document.head || document.body;
  const script = document.createElement('script');
  script.id = scriptId;
  script.type = 'text/javascript';
  script.src = source;
  script.async = true;
  script.crossOrigin = 'anonymous';
  (script as HTMLScriptElement & { fetchPriority: string }).fetchPriority = 'high';
  if (handlers?.onLoad) script.onload = handlers.onLoad;
  if (handlers?.onError) script.onerror = handlers.onError;
  target.appendChild(script);
}

function isObject(val: unknown): val is Record<string, unknown> {
  return val != null && typeof val === 'object' && Array.isArray(val) === false;
}

function parseSettingsString<T>(settingsString?: string): T[] {
  if (!settingsString) {
    return [];
  }
  try {
    return JSON.parse(settingsString.replace(/&quot;/g, '"')) as T[];
  } catch (_error) {
    console.error('Settings string contains invalid JSON');
  }
  return [];
}

function extractRoktExtensionConfig(settingsString?: string): RoktExtensionConfig {
  const settings = settingsString ? parseSettingsString<RoktExtensionEntry>(settingsString) : [];
  const roktExtensionsQueryParams: string[] = [];
  const legacyRoktExtensions: string[] = [];
  let loadThankYouElement = false;

  for (let i = 0; i < settings.length; i++) {
    const extensionName = settings[i].value;
    if (extensionName === 'thank-you-journey') {
      loadThankYouElement = true;
      legacyRoktExtensions.push(ROKT_THANK_YOU_JOURNEY_EXTENSION);
    } else {
      roktExtensionsQueryParams.push(extensionName);
    }
  }

  return {
    roktExtensionsQueryParams,
    legacyRoktExtensions,
    loadThankYouElement,
  };
}

function registerLegacyExtensions(legacyExtensions: string[], launcher: RoktLauncher|null) {
  if (launcher) {
    for (const extension of legacyExtensions) {
      launcher.use(extension);
    }
  }
}

function generateMappedEventLookup(placementEventMapping: PlacementEventMappingEntry[]): Record<string, string> {
  if (!placementEventMapping) {
    return {};
  }

  const mappedEvents: Record<string, string> = {};
  for (let i = 0; i < placementEventMapping.length; i++) {
    const mapping = placementEventMapping[i];
    mappedEvents[mapping.jsmap] = mapping.value;
  }
  return mappedEvents;
}

function generateMappedEventAttributeLookup(
  placementEventAttributeMapping: EventAttributeMapping[],
): Record<string, PlacementEventRule[]> {
  const mappedAttributeKeys: Record<string, PlacementEventRule[]> = {};
  if (!Array.isArray(placementEventAttributeMapping)) {
    return mappedAttributeKeys;
  }
  for (let i = 0; i < placementEventAttributeMapping.length; i++) {
    const mapping = placementEventAttributeMapping[i];
    if (!mapping || !isString(mapping.value) || !isString(mapping.map)) {
      continue;
    }

    const mappedAttributeKey = mapping.value;
    const eventAttributeKey = mapping.map;

    if (!mappedAttributeKeys[mappedAttributeKey]) {
      mappedAttributeKeys[mappedAttributeKey] = [];
    }

    mappedAttributeKeys[mappedAttributeKey].push({
      eventAttributeKey: eventAttributeKey,
      conditions: Array.isArray(mapping.conditions) ? mapping.conditions : [],
    });
  }
  return mappedAttributeKeys;
}

function hashEventMessage(messageType: number, eventType: number, eventName: string): string | number {
  return mp().generateHash([messageType, eventType, eventName].join(''));
}

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'object') {
    return Object.keys(value as object).length === 0;
  }
  if (Array.isArray(value)) {
    return (value as unknown[]).length === 0;
  }
  return false;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function generateIntegrationName(customIntegrationName?: string): string {
  const coreSdkVersion = mp().getVersion();
  const kitVersion = process.env.PACKAGE_VERSION;
  let integrationName = 'mParticle_' + 'wsdkv_' + coreSdkVersion + '_kitv_' + kitVersion;

  if (customIntegrationName) {
    integrationName += '_' + customIntegrationName;
  }
  return integrationName;
}

function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
    hash = hash & hash;
  }
  return hash;
}

function createAutoRemovedIframe(src: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  iframe.src = src;
  iframe.onload = function () {
    iframe.onload = null;
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  };
  const target = document.body || document.head;
  if (target) {
    target.appendChild(iframe);
  }
}

function sendAdBlockMeasurementSignals(domain: string | undefined, version: string | null): void {
  const originHash = djb2(window.location.origin);
  const allowedOriginHashes = RoktKit._allowedOriginHashes;
  if (allowedOriginHashes.indexOf(originHash) === -1) {
    return;
  }

  if (Math.random() >= INIT_LOG_SAMPLING_RATE) {
    return;
  }

  const guid = window.__rokt_li_guid__;
  if (!guid) {
    return;
  }

  const pageUrl = window.location.href.split('?')[0].split('#')[0];
  const params =
    'version=' +
    encodeURIComponent(version ?? '') +
    '&launcherInstanceGuid=' +
    encodeURIComponent(guid) +
    '&pageUrl=' +
    encodeURIComponent(pageUrl);

  const existingDomain = domain || 'apps.rokt.com';
  createAutoRemovedIframe('https://' + existingDomain + '/v1/wsdk-init/index.html?' + params);

  createAutoRemovedIframe(
    'https://' + ADBLOCK_CONTROL_DOMAIN + '/v1/wsdk-init/index.html?' + params + '&isControl=true',
  );
}

// ============================================================
// Reporting helpers
// ============================================================

function _isRoktDomainPresent(): boolean {
  return typeof window !== 'undefined' && Boolean(window.ROKT_DOMAIN);
}

function _isDebugModeEnabled(): boolean {
  return typeof window !== 'undefined' && !!window.location?.search?.toLowerCase().includes('mp_enable_logging=true');
}

function _getReportingUrl(): string | undefined {
  return typeof window !== 'undefined' ? window.location?.href : undefined;
}

function _getUserAgent(): string | undefined {
  return typeof window !== 'undefined' ? window.navigator?.userAgent : undefined;
}

class RateLimiter {
  private _logCount: Record<string, number> = {};

  incrementAndCheck(severity: string): boolean {
    const count = this._logCount[severity] || 0;
    const newCount = count + 1;
    this._logCount[severity] = newCount;
    return newCount > RATE_LIMIT_PER_SEVERITY;
  }
}

class ReportingTransport {
  private _isEnabled: boolean;
  private _integrationName: string;
  private _launcherInstanceGuid: string | undefined;
  private _accountId: string | null;
  private _rateLimiter: RateLimiter;
  private readonly _reporter = 'mp-wsdk';

  constructor(
    config: ReportingConfig,
    integrationName: string | null | undefined,
    launcherInstanceGuid: string | undefined,
    accountId: string | null | undefined,
    rateLimiter?: RateLimiter,
  ) {
    const isLoggingEnabled = config?.isLoggingEnabled === true || config?.isLoggingEnabled === 'true';
    this._integrationName = integrationName || '';
    this._launcherInstanceGuid = launcherInstanceGuid;
    this._accountId = accountId || null;
    this._rateLimiter = rateLimiter || new RateLimiter();
    this._isEnabled = _isDebugModeEnabled() || (_isRoktDomainPresent() && isLoggingEnabled);
  }

  send(
    url: string,
    severity: string,
    msg: string,
    code?: string,
    stackTrace?: string,
    onError?: (error: Error) => void,
  ): void {
    if (!this._isEnabled || this._rateLimiter.incrementAndCheck(severity)) {
      return;
    }

    try {
      const logRequest = {
        additionalInformation: {
          message: msg,
          version: this._integrationName,
        },
        severity,
        code: code || ErrorCodes.UNKNOWN_ERROR,
        url: _getReportingUrl(),
        deviceInfo: _getUserAgent(),
        stackTrace,
        reporter: this._reporter,
        integration: this._integrationName,
      };

      const headers: Record<string, string> = {
        Accept: 'text/plain;charset=UTF-8',
        'Content-Type': 'application/json',
        'rokt-launcher-version': this._integrationName,
        'rokt-wsdk-version': 'joint',
      };

      if (this._launcherInstanceGuid) {
        headers['rokt-launcher-instance-guid'] = this._launcherInstanceGuid;
      }
      if (this._accountId) {
        headers['rokt-account-id'] = this._accountId;
      }

      fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(logRequest),
      }).catch((error: Error) => {
        console.error('ReportingTransport: Failed to send log', error);
        if (onError) onError(error);
      });
    } catch (error) {
      console.error('ReportingTransport: Failed to send log', error);
      if (onError) onError(error as Error);
    }
  }
}

class ErrorReportingService {
  private _transport: ReportingTransport;
  private _errorUrl: string;

  constructor(
    config: ReportingConfig,
    integrationName: string | null | undefined,
    launcherInstanceGuid?: string,
    accountId?: string | null,
    rateLimiter?: RateLimiter,
  ) {
    this._transport = new ReportingTransport(config, integrationName, launcherInstanceGuid, accountId, rateLimiter);
    this._errorUrl = 'https://' + (config?.errorUrl || DEFAULT_ERROR_URL);
  }

  report(error: ErrorReport | null | undefined): void {
    if (!error) return;
    const severity = error.severity || WSDKErrorSeverity.ERROR;
    this._transport.send(this._errorUrl, severity, error.message, error.code, error.stackTrace);
  }
}

class LoggingService {
  private _transport: ReportingTransport;
  private _loggingUrl: string;
  private _errorReportingService: { report: (e: ErrorReport) => void };

  constructor(
    config: ReportingConfig,
    errorReportingService: { report: (e: ErrorReport) => void },
    integrationName: string | null | undefined,
    launcherInstanceGuid?: string,
    accountId?: string | null,
    rateLimiter?: RateLimiter,
  ) {
    this._transport = new ReportingTransport(config, integrationName, launcherInstanceGuid, accountId, rateLimiter);
    this._loggingUrl = 'https://' + (config?.loggingUrl || DEFAULT_LOGGING_URL);
    this._errorReportingService = errorReportingService;
  }

  log(entry: LogEntry | null | undefined): void {
    if (!entry) return;
    this._transport.send(
      this._loggingUrl,
      WSDKErrorSeverity.INFO,
      entry.message,
      entry.code,
      undefined,
      (error: Error) => {
        if (this._errorReportingService) {
          this._errorReportingService.report({
            message: 'LoggingService: Failed to send log: ' + error.message,
            code: ErrorCodes.UNKNOWN_ERROR,
            severity: WSDKErrorSeverity.ERROR,
          });
        }
      },
    );
  }
}

// ============================================================
// RoktKit class
// ============================================================

class RoktKit implements KitInterface {
  // Static field for allowed origin hashes (mutable by testHelpers)
  public static _allowedOriginHashes: number[] = [-553112570, 549508659];

  private static readonly PERFORMANCE_MARKS = {
    RoktScriptAppended: 'mp:RoktScriptAppended',
  };

  private static readonly EMAIL_SHA256_KEY = 'emailsha256';

  // Public fields (accessed by tests and the mParticle framework)
  public name = name;
  public id = moduleId;
  public moduleId = moduleId;
  public isInitialized = false;
  public launcher: RoktLauncher | null = null;
  public filters: KitFilters = {};
  public userAttributes: Record<string, unknown> = {};
  public testHelpers: TestHelpers | null = null;
  public placementEventMappingLookup: Record<string, string> = {};
  public placementEventAttributeMappingLookup: Record<string, PlacementEventRule[]> = {};
  public batchQueue: Batch[] = [];
  public batchStreamQueue: Batch[] = [];
  public pendingIdentityEvents: BaseEvent[] = [];
  public integrationName: string | null = null;
  public domain?: string;
  public errorReportingService: ErrorReportingService | null = null;
  public loggingService: LoggingService | null = null;

  // Private fields
  private _mappedEmailSha256Key?: string;
  private _onboardingExpProvider?: string;

  // ---- Private helpers ----

  private getEventAttributeValue(event: SDKEvent, eventAttributeKey: string): unknown {
    const attributes = event && event.EventAttributes;
    if (!attributes) {
      return null;
    }

    if (typeof attributes[eventAttributeKey] === 'undefined') {
      return null;
    }

    return attributes[eventAttributeKey];
  }

  private doesEventAttributeConditionMatch(condition: EventAttributeCondition, actualValue: unknown): boolean {
    if (!condition || !isString(condition.operator)) {
      return false;
    }

    const operator = condition.operator.toLowerCase();
    const expectedValue = condition.attributeValue;

    if (operator === 'exists') {
      return actualValue !== null;
    }

    if (actualValue == null) {
      return false;
    }

    if (operator === 'equals') {
      return String(actualValue) === String(expectedValue);
    }

    if (operator === 'contains') {
      return String(actualValue).indexOf(String(expectedValue)) !== -1;
    }

    return false;
  }

  private doesEventMatchRule(event: SDKEvent, rule: PlacementEventRule): boolean {
    if (!rule || !isString(rule.eventAttributeKey)) {
      return false;
    }

    const conditions = rule.conditions;
    if (!Array.isArray(conditions)) {
      return false;
    }

    const actualValue = this.getEventAttributeValue(event, rule.eventAttributeKey);

    if (conditions.length === 0) {
      return actualValue !== null;
    }
    for (let i = 0; i < conditions.length; i++) {
      if (!this.doesEventAttributeConditionMatch(conditions[i], actualValue)) {
        return false;
      }
    }

    return true;
  }

  private applyPlacementEventAttributeMapping(event: SDKEvent): void {
    const mappedAttributeKeys = Object.keys(this.placementEventAttributeMappingLookup);
    for (let i = 0; i < mappedAttributeKeys.length; i++) {
      const mappedAttributeKey = mappedAttributeKeys[i];
      const rulesForMappedAttributeKey = this.placementEventAttributeMappingLookup[mappedAttributeKey];
      if (isEmpty(rulesForMappedAttributeKey)) {
        continue;
      }

      // Require ALL rules for the same key to match (AND).
      let allMatch = true;
      for (let j = 0; j < rulesForMappedAttributeKey.length; j++) {
        if (!this.doesEventMatchRule(event, rulesForMappedAttributeKey[j])) {
          allMatch = false;
          break;
        }
      }
      if (!allMatch) {
        continue;
      }

      mp().Rokt.setLocalSessionAttribute?.(mappedAttributeKey, true);
    }
  }

  private isLauncherReadyToAttach(): boolean {
    return !!window.Rokt && typeof window.Rokt.createLauncher === 'function';
  }

  /**
   * Returns the user identities from the filtered user, if any.
   */
  private returnUserIdentities(filteredUser: FilteredUser | null | undefined): Record<string, string> {
    if (!filteredUser || !filteredUser.getUserIdentities) {
      return {};
    }

    const userIdentities = filteredUser.getUserIdentities().userIdentities;

    return this.replaceOtherIdentityWithEmailsha256(userIdentities);
  }

  private returnLocalSessionAttributes(): Record<string, unknown> {
    if (!mp().Rokt || typeof mp().Rokt.getLocalSessionAttributes !== 'function') {
      return {};
    }
    if (isEmpty(this.placementEventMappingLookup) && isEmpty(this.placementEventAttributeMappingLookup)) {
      return {};
    }
    return mp().Rokt.getLocalSessionAttributes!();
  }

  private replaceOtherIdentityWithEmailsha256(userIdentities: Record<string, string>): Record<string, string> {
    const newUserIdentities: Record<string, string> = { ...(userIdentities || {}) };
    const key = this._mappedEmailSha256Key;
    if (key && userIdentities[key]) {
      newUserIdentities[RoktKit.EMAIL_SHA256_KEY] = userIdentities[key];
    }
    if (key) {
      delete newUserIdentities[key];
    }

    return newUserIdentities;
  }

  private logSelectPlacementsEvent(attributes: unknown): void {
    if (!window.mParticle || typeof mp().logEvent !== 'function') {
      return;
    }

    if (!isObject(attributes)) {
      return;
    }

    const EVENT_TYPE_OTHER = mp().EventType.Other;

    mp().logEvent(EVENT_NAME_SELECT_PLACEMENTS, EVENT_TYPE_OTHER, attributes as Record<string, unknown>);
  }

  private buildIdentityEvent(eventType: RoktIdentityEventType, filteredUser: FilteredUser): BaseEvent {
    const mpid = filteredUser.getMPID();
    const sessionUuid =
      mp() && mp().sessionManager && typeof mp().sessionManager!.getSession === 'function'
        ? mp().sessionManager!.getSession()
        : undefined;

    return {
      event_type: eventType,
      data: {
        timestamp_unixtime_ms: Date.now(),
        session_uuid: sessionUuid ?? undefined,
        mpid,
      },
    } as unknown as BaseEvent;
  }

  private mergePendingIdentityEvents(batch: Batch): Batch {
    if (this.pendingIdentityEvents.length === 0) {
      return batch;
    }
    const merged: Batch = {
      ...batch,
      events: [...(batch.events ?? []), ...this.pendingIdentityEvents],
    };
    this.pendingIdentityEvents = [];
    return merged;
  }

  private drainBatchQueue(): void {
    this.batchQueue.forEach((batch) => {
      this.processBatch(batch);
    });
    this.batchQueue = [];
  }

  public processBatch(batch: Batch): string {
    if (!this.isKitReady()) {
      this.batchQueue.push(batch);
      return 'Batch queued for forwarder: ' + name;
    }
    this.sendBatchStream(this.mergePendingIdentityEvents(batch));
    return 'Successfully sent batch to forwarder: ' + name;
  }

  private sendBatchStream(batch: Batch): void {
    if (window.Rokt && typeof window.Rokt.__batch_stream__ === 'function') {
      if (this.batchStreamQueue.length) {
        const queuedBatches = this.batchStreamQueue;
        this.batchStreamQueue = [];
        for (let i = 0; i < queuedBatches.length; i++) {
          window.Rokt.__batch_stream__(queuedBatches[i]);
        }
      }
      window.Rokt.__batch_stream__(batch);
    } else {
      this.batchStreamQueue.push(batch);
    }
  }

  private setRoktSessionId(sessionId: string): void {
    if (!sessionId || typeof sessionId !== 'string') {
      return;
    }
    try {
      const mpInstance = mp().getInstance();
      if (mpInstance && typeof mpInstance.setIntegrationAttribute === 'function') {
        mpInstance.setIntegrationAttribute(moduleId, {
          roktSessionId: sessionId,
        });
      }
    } catch (_e) {
      // Best effort — never let this break the partner page
    }
  }

  private attachLauncher(accountId: string, launcherOptions: Record<string, unknown>): void {
    const mpSessionId =
      mp() && mp().sessionManager && typeof mp().sessionManager!.getSession === 'function'
        ? mp().sessionManager!.getSession()
        : undefined;

    const options: Record<string, unknown> = {
      accountId,
      ...(launcherOptions || {}),
      ...(mpSessionId ? { mpSessionId } : {}),
    };

    if (this.isPartnerInLocalLauncherTestGroup()) {
      const localLauncher = window.Rokt!.createLocalLauncher(options);
      this.initRoktLauncher(localLauncher);
    } else {
      window
        .Rokt!.createLauncher(options)
        .then((launcher) => this.initRoktLauncher(launcher))
        .catch((err: unknown) => {
          console.error('Error creating Rokt launcher:', err);
        });
    }
  }

  private initRoktLauncher(launcher: RoktLauncher): void {
    // Assign the launcher to a global variable for later access
    if (window.Rokt) {
      window.Rokt.currentLauncher = launcher;
    }
    // Locally cache the launcher and filters
    this.launcher = launcher;

    const roktFilters = mp().Rokt?.filters;

    if (!roktFilters) {
      console.warn('Rokt Kit: No filters have been set.');
    } else {
      this.filters = roktFilters;
      if (!roktFilters.filteredUser) {
        console.warn('Rokt Kit: No filtered user has been set.');
      }
    }

    // Kit must be initialized before attaching to the Rokt manager
    this.isInitialized = true;

    sendAdBlockMeasurementSignals(this.domain, this.integrationName);

    // Attaches the kit to the Rokt manager
    mp().Rokt.attachKit(this);
    this.drainBatchQueue();
  }

  private fetchOptimizely(): Record<string, unknown> {
    const forwarders = mp()
      ._getActiveForwarders()
      .filter((forwarder) => forwarder.name === 'Optimizely');

    try {
      if (forwarders.length > 0 && window.optimizely) {
        const optimizelyState = window.optimizely.get('state');
        if (!optimizelyState || !optimizelyState.getActiveExperimentIds) {
          return {};
        }
        const activeExperimentIds = optimizelyState.getActiveExperimentIds();
        const activeExperiments = activeExperimentIds.reduce((acc: Record<string, string>, expId: string) => {
          acc['rokt.custom.optimizely.experiment.' + expId + '.variationId'] =
            optimizelyState.getVariationMap()[expId].id;
          return acc;
        }, {});
        return activeExperiments;
      }
    } catch (error) {
      console.error('Error fetching Optimizely attributes:', error);
    }
    return {};
  }

  private isKitReady(): boolean {
    return !!(this.isInitialized && this.launcher);
  }

  private isPartnerInLocalLauncherTestGroup(): boolean {
    return !!(mp().config && mp().config!.isLocalLauncherEnabled && this.isAssignedToSampleGroup());
  }

  private isAssignedToSampleGroup(): boolean {
    const LOCAL_LAUNCHER_TEST_GROUP_THRESHOLD = 0.5;
    return Math.random() > LOCAL_LAUNCHER_TEST_GROUP_THRESHOLD;
  }

  private captureTiming(metricName: string): void {
    if (window && mp() && mp().captureTiming && metricName) {
      mp().captureTiming!(metricName);
    }
  }

  // ---- Public methods (mParticle Kit Callbacks) ----

  /**
   * Initializes the Rokt forwarder with settings from the mParticle server.
   */
  public init(
    settings: Record<string, unknown>,
    _service: unknown,
    testMode: boolean,
    _trackerId: unknown,
    filteredUserAttributes: Record<string, unknown>,
  ): string {
    const kitSettings = settings as unknown as RoktKitSettings;
    const accountId = kitSettings.accountId;
    this.userAttributes = filteredUserAttributes || {};
    this._onboardingExpProvider = kitSettings.onboardingExpProvider;

    const placementEventMapping = parseSettingsString<PlacementEventMappingEntry>(kitSettings.placementEventMapping);
    this.placementEventMappingLookup = generateMappedEventLookup(placementEventMapping);

    const placementEventAttributeMapping = parseSettingsString<EventAttributeMapping>(
      kitSettings.placementEventAttributeMapping,
    );
    this.placementEventAttributeMappingLookup = generateMappedEventAttributeLookup(placementEventAttributeMapping);

    // Set dynamic OTHER_IDENTITY based on server settings
    if (kitSettings.hashedEmailUserIdentityType) {
      this._mappedEmailSha256Key = kitSettings.hashedEmailUserIdentityType.toLowerCase();
    }

    const domain = mp().Rokt?.domain;
    const { roktExtensionsQueryParams, legacyRoktExtensions, loadThankYouElement } = extractRoktExtensionConfig(
      kitSettings.roktExtensions,
    );
    const launcherOptions: Record<string, unknown> = {
      ...((mp().Rokt?.launcherOptions as Record<string, unknown>) || {}),
    };
    this.integrationName = generateIntegrationName(launcherOptions.integrationName as string | undefined);
    launcherOptions.integrationName = this.integrationName;

    this.domain = domain;

    const reportingConfig: ReportingConfig = {
      loggingUrl: kitSettings.loggingUrl,
      errorUrl: kitSettings.errorUrl,
      isLoggingEnabled: kitSettings.isLoggingEnabled === 'true' || kitSettings.isLoggingEnabled === true,
    };
    const errorReportingService = new ErrorReportingService(
      reportingConfig,
      this.integrationName,
      window.__rokt_li_guid__,
      kitSettings.accountId,
    );
    const loggingService = new LoggingService(
      reportingConfig,
      errorReportingService,
      this.integrationName,
      window.__rokt_li_guid__,
      kitSettings.accountId,
    );

    this.errorReportingService = errorReportingService;
    this.loggingService = loggingService;

    if (mp()._registerErrorReportingService) {
      mp()._registerErrorReportingService!(errorReportingService);
    }
    if (mp()._registerLoggingService) {
      mp()._registerLoggingService!(loggingService);
    }

    if (testMode) {
      this.testHelpers = {
        generateLauncherScript: generateLauncherScript,
        generateThankYouElementScript: generateThankYouElementScript,
        extractRoktExtensionConfig: extractRoktExtensionConfig,
        hashEventMessage: hashEventMessage,
        parseSettingsString: parseSettingsString,
        generateMappedEventLookup: generateMappedEventLookup,
        generateMappedEventAttributeLookup: generateMappedEventAttributeLookup,
        sendAdBlockMeasurementSignals: sendAdBlockMeasurementSignals,
        createAutoRemovedIframe: createAutoRemovedIframe,
        djb2: djb2,
        setAllowedOriginHashes: (hashes: number[]) => {
          RoktKit._allowedOriginHashes = hashes;
        },
        ReportingTransport: ReportingTransport,
        ErrorReportingService: ErrorReportingService,
        LoggingService: LoggingService,
        RateLimiter: RateLimiter,
        ErrorCodes: ErrorCodes,
        WSDKErrorSeverity: WSDKErrorSeverity,
      };
      this.attachLauncher(accountId, launcherOptions);
      return 'Successfully initialized: ' + name;
    }

    if (loadThankYouElement) {
      loadRoktScript(ROKT_THANK_YOU_ELEMENT_SCRIPT_ID, generateThankYouElementScript(domain));
    }

    if (this.isLauncherReadyToAttach()) {
      this.attachLauncher(accountId, launcherOptions);
    } else {
      loadRoktScript(ROKT_INTEGRATION_SCRIPT_ID, generateLauncherScript(domain, roktExtensionsQueryParams), {
        onLoad: () => {
          if (this.isLauncherReadyToAttach()) {
            this.attachLauncher(accountId, launcherOptions);
            registerLegacyExtensions(legacyRoktExtensions, this.launcher);
          } else {
            console.error('Rokt object is not available after script load.');
          }
        },
        onError: (error) => {
          console.error('Error loading Rokt launcher script:', error);
        },
      });

      this.captureTiming(RoktKit.PERFORMANCE_MARKS.RoktScriptAppended);
    }

    return 'Successfully initialized: ' + name;
  }

  public process(event: SDKEvent): string {
    if (!this.isKitReady()) {
      return 'Kit not ready for forwarder: ' + name;
    }
    if (typeof mp().Rokt?.setLocalSessionAttribute === 'function') {
      if (!isEmpty(this.placementEventAttributeMappingLookup)) {
        this.applyPlacementEventAttributeMapping(event);
      }

      if (!isEmpty(this.placementEventMappingLookup)) {
        const hashedEvent = hashEventMessage(event.EventDataType, event.EventCategory, event.EventName ?? '');
        if (this.placementEventMappingLookup[String(hashedEvent)]) {
          mp().Rokt.setLocalSessionAttribute?.(this.placementEventMappingLookup[String(hashedEvent)], true);
        }
      }
    }

    return 'Successfully sent to forwarder: ' + name;
  }

  public setExtensionData(partnerExtensionData: Record<string, unknown>): void {
    if (!this.isKitReady()) {
      console.error('Rokt Kit: Not initialized');
      return;
    }

    window.Rokt!.setExtensionData(partnerExtensionData);
  }

  public setUserAttribute(key: string, value: unknown): string {
    this.userAttributes[key] = value;
    return 'Successfully set user attribute for forwarder: ' + name;
  }

  public removeUserAttribute(key: string): string {
    delete this.userAttributes[key];
    return 'Successfully removed user attribute for forwarder: ' + name;
  }

  private handleIdentityComplete(user: IMParticleUser, eventType: RoktIdentityEventType, callbackName: string): string {
    const filteredUser = user as FilteredUser;
    this.userAttributes = user.getAllUserAttributes();
    this.pendingIdentityEvents.push(this.buildIdentityEvent(eventType, filteredUser));
    return 'Successfully called ' + callbackName + ' for forwarder: ' + name;
  }

  public onUserIdentified(user: IMParticleUser): string {
    this.filters.filteredUser = user as FilteredUser;
    return this.handleIdentityComplete(user, ROKT_IDENTITY_EVENT_TYPE.IDENTIFY, 'onUserIdentified');
  }

  public onLoginComplete(user: IMParticleUser, _filteredIdentityRequest: unknown): string {
    return this.handleIdentityComplete(user, ROKT_IDENTITY_EVENT_TYPE.LOGIN, 'onLoginComplete');
  }

  public onLogoutComplete(user: IMParticleUser, _filteredIdentityRequest: unknown): string {
    return this.handleIdentityComplete(user, ROKT_IDENTITY_EVENT_TYPE.LOGOUT, 'onLogoutComplete');
  }

  public onModifyComplete(user: IMParticleUser, _filteredIdentityRequest: unknown): string {
    return this.handleIdentityComplete(user, ROKT_IDENTITY_EVENT_TYPE.MODIFY_USER, 'onModifyComplete');
  }

  /**
   * Selects placements for Rokt Web SDK with merged attributes, filters, and experimentation options.
   */
  public selectPlacements(options: Record<string, unknown>): RoktSelection | Promise<RoktSelection> | undefined {
    const attributes = ((options && (options.attributes as Record<string, unknown>)) || {}) as Record<string, unknown>;
    const placementAttributes: Record<string, unknown> = { ...this.userAttributes, ...attributes };

    const filters = this.filters || {};
    const userAttributeFilters = (filters.userAttributeFilters as string[]) || [];
    const filteredUser = filters.filteredUser || null;
    const mpid = filteredUser ? filteredUser.getMPID() : null;

    let filteredAttributes: Record<string, unknown>;

    if (!filters) {
      console.warn('Rokt Kit: No filters available, using user attributes');
      filteredAttributes = placementAttributes;
    } else if (filters.filterUserAttributes) {
      filteredAttributes = filters.filterUserAttributes(placementAttributes, userAttributeFilters);
    } else {
      filteredAttributes = placementAttributes;
    }

    this.userAttributes = filteredAttributes;

    const optimizelyAttributes = this._onboardingExpProvider === 'Optimizely' ? this.fetchOptimizely() : {};

    const filteredUserIdentities = this.returnUserIdentities(filteredUser);

    const localSessionAttributes = this.returnLocalSessionAttributes();

    const selectPlacementsAttributes: Record<string, unknown> = {
      ...(filteredUserIdentities as Record<string, unknown>),
      ...filteredAttributes,
      ...optimizelyAttributes,
      ...localSessionAttributes,
      mpid,
    };

    const selectPlacementsOptions: Record<string, unknown> = { ...options, attributes: selectPlacementsAttributes };

    const selection = this.launcher!.selectPlacements(selectPlacementsOptions);

    // After selection resolves, sync the Rokt session ID back to mParticle, then log
    const logSelection = () => this.logSelectPlacementsEvent(selectPlacementsAttributes);

    void Promise.resolve(selection)
      .then((sel) => sel?.context?.sessionId?.then((sessionId) => this.setRoktSessionId(sessionId)))
      .catch(() => undefined)
      .finally(logSelection);

    return selection;
  }

  /**
   * Passes attributes to the Rokt Web SDK for client-side hashing.
   */
  public hashAttributes(attributes: Record<string, unknown>): Promise<Record<string, unknown>> | null {
    if (!this.isKitReady()) {
      console.error('Rokt Kit: Not initialized');
      return null;
    }
    return this.launcher!.hashAttributes(attributes);
  }

  /**
   * Enables optional Integration Launcher extensions before selecting placements.
   *
   * @deprecated This functionality has been internalized and will be removed in a future release.
   */
  public use(extensionName: string): Promise<unknown> {
    if (!this.isKitReady()) {
      console.error('Rokt Kit: Not initialized');
      return Promise.reject(new Error('Rokt Kit: Not initialized'));
    }
    if (!extensionName || !isString(extensionName)) {
      return Promise.reject(new Error('Rokt Kit: Invalid extension name'));
    }
    return this.launcher!.use(extensionName);
  }
}

// ============================================================
// Kit registration
// ============================================================

function getId(): number {
  return moduleId;
}

function register(config: { kits?: Record<string, unknown> }): void {
  if (!config) {
    window.console.log('You must pass a config object to register the kit ' + name);
    return;
  }
  if (!isObject(config)) {
    window.console.log("'config' must be an object. You passed in a " + typeof config);
    return;
  }

  if (isObject(config.kits)) {
    (config.kits as Record<string, unknown>)[name] = {
      constructor: RoktKit,
    };
  } else {
    config.kits = {};
    config.kits[name] = {
      constructor: RoktKit,
    };
  }
  window.console.log('Successfully registered ' + name + ' to your mParticle configuration');
}

if (typeof window !== 'undefined' && window.mParticle && mp().addForwarder) {
  mp().addForwarder({
    name: name,
    constructor: RoktKit,
    getId: getId,
  });
}

export { register };
