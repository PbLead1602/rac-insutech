"use client";

import { KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import type { IndiaPostalLocation } from "@/lib/india-postal-locations";
import { postalLocationLabel } from "@/lib/india-postal-locations";

export type IndiaLocationValue = { state: string; district: string; city: string; pinCode: string };
export type IndiaLocationField = "state" | "city" | "pinCode";

type IndiaLocationFieldsProps = {
  fields?: readonly IndiaLocationField[];
  defaultValue?: Partial<IndiaLocationValue>;
  value?: Partial<IndiaLocationValue>;
  onChange?: (value: IndiaLocationValue) => void;
  readOnly?: boolean;
};

type Suggestion = { label: string };

const defaultFields: readonly IndiaLocationField[] = ["state", "city", "pinCode"];
const emptyLocation: IndiaLocationValue = { state: "", district: "", city: "", pinCode: "" };
const sameLocation = (left: IndiaLocationValue, right: IndiaLocationValue) => left.state === right.state && left.district === right.district && left.city === right.city && left.pinCode === right.pinCode;

function locationFrom(value?: Partial<IndiaLocationValue>): IndiaLocationValue {
  return {
    state: value?.state || "",
    district: value?.district || "",
    city: value?.city || "",
    pinCode: value?.pinCode || "",
  };
}

async function requestPostalLookup<T>(parameters: Record<string, string>, signal: AbortSignal): Promise<T> {
  const search = new URLSearchParams(parameters);
  const response = await fetch(`/api/locations?${search.toString()}`, { signal });
  const payload = await response.json() as T & { message?: string };
  if (!response.ok) throw new Error(payload.message || "Postal lookup is unavailable.");
  return payload;
}

function LocationSuggestionList({ id, label, options, activeIndex, onChoose, emptyMessage }: { id: string; label: string; options: readonly Suggestion[]; activeIndex: number; onChoose: (index: number) => void; emptyMessage: string }) {
  return <div id={id} className="rac-location-options" role="listbox" aria-label={label}>{options.length ? options.map((option, index) => <button type="button" role="option" aria-selected={activeIndex === index} className={activeIndex === index ? "active" : ""} id={`${id}-${index}`} key={`${option.label}-${index}`} onPointerDown={(event) => event.preventDefault()} onClick={() => onChoose(index)}>{option.label}</button>) : <p>{emptyMessage}</p>}</div>;
}

export function IndiaLocationFields({ fields = defaultFields, defaultValue, value, onChange, readOnly = false }: IndiaLocationFieldsProps) {
  const fieldKey = fields.join("|");
  const visible = useMemo(() => new Set(fieldKey.split("|") as IndiaLocationField[]), [fieldKey]);
  const stateInputId = useId();
  const cityInputId = useId();
  const pinCodeInputId = useId();
  const stateListId = useId();
  const cityListId = useId();
  const pinCodeListId = useId();
  const initial = locationFrom(value || defaultValue);
  const [selection, setSelection] = useState<IndiaLocationValue>(initial);
  const [stateQuery, setStateQuery] = useState(initial.state);
  const [cityQuery, setCityQuery] = useState(initial.city);
  const [pinCodeQuery, setPinCodeQuery] = useState(initial.pinCode);
  const [stateOpen, setStateOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [pinCodeOpen, setPinCodeOpen] = useState(false);
  const [activeStateIndex, setActiveStateIndex] = useState(-1);
  const [activeCityIndex, setActiveCityIndex] = useState(-1);
  const [activePinCodeIndex, setActivePinCodeIndex] = useState(-1);
  const [stateSuggestions, setStateSuggestions] = useState<string[]>([]);
  const [citySuggestions, setCitySuggestions] = useState<IndiaPostalLocation[]>([]);
  const [reversePinSuggestions, setReversePinSuggestions] = useState<IndiaPostalLocation[]>([]);
  const [stateLookupError, setStateLookupError] = useState("");
  const [cityLookupError, setCityLookupError] = useState("");
  const [pinLookupError, setPinLookupError] = useState("");
  const lastEmitted = useRef<IndiaLocationValue | null>(null);
  const isControlled = value !== undefined;
  const controlledState = value?.state;
  const controlledDistrict = value?.district;
  const controlledCity = value?.city;
  const controlledPinCode = value?.pinCode;

  useEffect(() => {
    if (!isControlled) return;
    const next = locationFrom({ state: controlledState, district: controlledDistrict, city: controlledCity, pinCode: controlledPinCode });
    if (lastEmitted.current && sameLocation(next, lastEmitted.current)) return;
    setSelection(next);
    setStateQuery(next.state);
    setCityQuery(next.city);
    setPinCodeQuery(next.pinCode);
  }, [controlledCity, controlledDistrict, controlledPinCode, controlledState, isControlled]);

  useEffect(() => {
    if (!stateOpen || !stateQuery.trim()) { setStateSuggestions([]); setStateLookupError(""); return; }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void requestPostalLookup<{ states: string[] }>({ kind: "states", q: stateQuery }, controller.signal)
        .then((result) => { setStateSuggestions(result.states); setStateLookupError(""); })
        .catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) { setStateSuggestions([]); setStateLookupError(error instanceof Error ? error.message : "Postal lookup is unavailable."); } });
    }, 250);
    return () => { controller.abort(); window.clearTimeout(timeout); };
  }, [stateOpen, stateQuery]);

  useEffect(() => {
    if (!cityOpen || cityQuery.trim().length < 2 || !selection.state) { setCitySuggestions([]); setCityLookupError(""); return; }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void requestPostalLookup<{ locations: IndiaPostalLocation[] }>({ kind: "cities", q: cityQuery, state: selection.state }, controller.signal)
        .then((result) => { setCitySuggestions(result.locations); setCityLookupError(""); })
        .catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) { setCitySuggestions([]); setCityLookupError(error instanceof Error ? error.message : "Postal lookup is unavailable."); } });
    }, 250);
    return () => { controller.abort(); window.clearTimeout(timeout); };
  }, [cityOpen, cityQuery, selection.state]);

  useEffect(() => {
    if (!pinCodeOpen || selection.city || !/^\d{6}$/u.test(pinCodeQuery)) { setReversePinSuggestions([]); setPinLookupError(""); return; }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void requestPostalLookup<{ locations: IndiaPostalLocation[] }>({ kind: "pin", pin: pinCodeQuery }, controller.signal)
        .then((result) => { setReversePinSuggestions(result.locations); setPinLookupError(""); })
        .catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) { setReversePinSuggestions([]); setPinLookupError(error instanceof Error ? error.message : "Postal lookup is unavailable."); } });
    }, 250);
    return () => { controller.abort(); window.clearTimeout(timeout); };
  }, [pinCodeOpen, pinCodeQuery, selection.city]);

  const update = (next: IndiaLocationValue) => {
    setSelection(next);
    lastEmitted.current = next;
    onChange?.(next);
  };
  const cityEnabled = !visible.has("state") || Boolean(selection.state);
  const selectedCityPinCodes = selection.city ? (citySuggestions.find((option) => option.city === selection.city && option.district === selection.district && option.state === selection.state)?.pinCodes || []) : [];
  const pinCodeSuggestions = selectedCityPinCodes.filter((pinCode) => pinCode.startsWith(pinCodeQuery.trim()));
  const stateOptions = stateSuggestions.map((state) => ({ label: state }));
  const cityOptions = citySuggestions.map((location) => ({ label: postalLocationLabel(location) }));
  const pinOptions = selection.city ? pinCodeSuggestions.map((pinCode) => ({ label: pinCode })) : reversePinSuggestions.map((location) => ({ label: postalLocationLabel(location) }));

  const chooseState = (state: string) => {
    setStateQuery(state);
    setCityQuery("");
    setPinCodeQuery("");
    update({ ...emptyLocation, state });
    setStateOpen(false);
    setCityOpen(false);
    setPinCodeOpen(false);
    setActiveStateIndex(-1);
  };
  const chooseCity = (location: IndiaPostalLocation) => {
    const next = { state: location.state, district: location.district, city: location.city, pinCode: "" };
    setStateQuery(location.state);
    setCityQuery(location.city);
    setPinCodeQuery("");
    update(next);
    setCityOpen(false);
    setPinCodeOpen(false);
    setActiveCityIndex(-1);
  };
  const choosePinCode = (pinCode: string) => {
    setPinCodeQuery(pinCode);
    update({ ...selection, pinCode });
    setPinCodeOpen(false);
    setActivePinCodeIndex(-1);
  };
  const chooseReversePinLocation = (location: IndiaPostalLocation) => {
    const next = { state: location.state, district: location.district, city: location.city, pinCode: pinCodeQuery };
    setStateQuery(location.state);
    setCityQuery(location.city);
    update(next);
    setPinCodeOpen(false);
    setActivePinCodeIndex(-1);
  };
  const navigate = (event: KeyboardEvent<HTMLInputElement>, optionCount: number, activeIndex: number, setActiveIndex: (index: number) => void, choose: (index: number) => void, setOpen: (open: boolean) => void) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActiveIndex(optionCount ? (activeIndex + 1) % optionCount : -1); return; }
    if (event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActiveIndex(optionCount ? (activeIndex - 1 + optionCount) % optionCount : -1); return; }
    if (event.key === "Enter" && activeIndex >= 0 && activeIndex < optionCount) { event.preventDefault(); choose(activeIndex); return; }
    if (event.key === "Escape") { setOpen(false); setActiveIndex(-1); }
  };

  const stateField = visible.has("state") && <div className="rac-location-field"><label htmlFor={stateInputId}>State</label>{readOnly ? <input id={stateInputId} name="state" readOnly value={selection.state} /> : <div className="rac-location-combobox"><input id={stateInputId} value={stateQuery} autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={stateOpen && Boolean(stateQuery.trim())} aria-controls={stateListId} aria-activedescendant={activeStateIndex >= 0 ? `${stateListId}-${activeStateIndex}` : undefined} onFocus={() => setStateOpen(true)} onBlur={() => window.setTimeout(() => setStateOpen(false), 120)} onChange={(event) => { setStateQuery(event.target.value); setCityQuery(""); setPinCodeQuery(""); update(emptyLocation); setStateOpen(true); setActiveStateIndex(-1); }} onKeyDown={(event) => navigate(event, stateOptions.length, activeStateIndex, setActiveStateIndex, (index) => chooseState(stateSuggestions[index]), setStateOpen)} placeholder="Start typing a state" /><input type="hidden" name="state" value={selection.state} />{stateOpen && stateQuery.trim() && <LocationSuggestionList id={stateListId} label="Matching states" options={stateOptions} activeIndex={activeStateIndex} onChoose={(index) => chooseState(stateSuggestions[index])} emptyMessage={stateLookupError || "No matching states found"} />}</div>}</div>;
  const cityField = visible.has("city") && <div className="rac-location-field"><label htmlFor={cityInputId}>City</label>{readOnly ? <input id={cityInputId} name="city" readOnly value={selection.city} /> : <div className="rac-location-combobox"><input id={cityInputId} value={cityQuery} disabled={!cityEnabled} autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={cityOpen && Boolean(cityQuery.trim())} aria-controls={cityListId} aria-activedescendant={activeCityIndex >= 0 ? `${cityListId}-${activeCityIndex}` : undefined} onFocus={() => setCityOpen(true)} onBlur={() => window.setTimeout(() => setCityOpen(false), 120)} onChange={(event) => { setCityQuery(event.target.value); setPinCodeQuery(""); update({ ...emptyLocation, state: selection.state }); setCityOpen(true); setActiveCityIndex(-1); }} onKeyDown={(event) => navigate(event, cityOptions.length, activeCityIndex, setActiveCityIndex, (index) => chooseCity(citySuggestions[index]), setCityOpen)} placeholder={cityEnabled ? "Search City or locality" : "Select state first"} /><input type="hidden" name="city" value={selection.city} />{cityOpen && cityQuery.trim().length >= 2 && <LocationSuggestionList id={cityListId} label="Matching cities" options={cityOptions} activeIndex={activeCityIndex} onChoose={(index) => chooseCity(citySuggestions[index])} emptyMessage={cityLookupError || "No matching City or locality found"} />}</div>}</div>;
  const pinCodeField = visible.has("pinCode") && <div className="rac-location-field"><label htmlFor={pinCodeInputId}>PIN code</label>{readOnly ? <input id={pinCodeInputId} name="pinCode" readOnly value={selection.pinCode} /> : <div className="rac-location-combobox"><input id={pinCodeInputId} value={pinCodeQuery} autoComplete="off" inputMode="numeric" role="combobox" aria-autocomplete="list" aria-expanded={pinCodeOpen} aria-controls={pinCodeListId} aria-activedescendant={activePinCodeIndex >= 0 ? `${pinCodeListId}-${activePinCodeIndex}` : undefined} onFocus={() => setPinCodeOpen(true)} onBlur={() => window.setTimeout(() => setPinCodeOpen(false), 120)} onChange={(event) => { setPinCodeQuery(event.target.value); update({ ...selection, pinCode: "" }); setPinCodeOpen(true); setActivePinCodeIndex(-1); }} onKeyDown={(event) => navigate(event, pinOptions.length, activePinCodeIndex, setActivePinCodeIndex, (index) => selection.city ? choosePinCode(pinCodeSuggestions[index]) : chooseReversePinLocation(reversePinSuggestions[index]), setPinCodeOpen)} placeholder={selection.city ? "Search and select PIN code" : "Enter PIN to find City"} /><input type="hidden" name="pinCode" value={selection.pinCode} />{pinCodeOpen && <LocationSuggestionList id={pinCodeListId} label={selection.city ? `PIN codes for ${selection.city}` : "Locations for this PIN code"} options={pinOptions} activeIndex={activePinCodeIndex} onChoose={(index) => selection.city ? choosePinCode(pinCodeSuggestions[index]) : chooseReversePinLocation(reversePinSuggestions[index])} emptyMessage={selection.city ? "No matching PIN codes found" : pinLookupError || "Enter a six-digit PIN code to find City, District and State"} />}</div>}</div>;

  return <>{!visible.has("state") && <input type="hidden" name="state" value={selection.state} />}{stateField}{cityField}{pinCodeField}<input type="hidden" name="district" value={selection.district} /></>;
}
