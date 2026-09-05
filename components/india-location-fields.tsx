"use client";

import { KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { findIndiaCityPinCodeOption, findIndiaState, searchIndiaCities, searchIndiaStates } from "@/lib/india-city-pin-codes";

export type IndiaLocationValue = { state: string; city: string; pinCode: string };
export type IndiaLocationField = keyof IndiaLocationValue;

type IndiaLocationFieldsProps = {
  fields?: readonly IndiaLocationField[];
  defaultValue?: Partial<IndiaLocationValue>;
  value?: Partial<IndiaLocationValue>;
  onChange?: (value: IndiaLocationValue) => void;
  readOnly?: boolean;
};

const defaultFields: readonly IndiaLocationField[] = ["state", "city", "pinCode"];
const emptyLocation: IndiaLocationValue = { state: "", city: "", pinCode: "" };
const sameLocation = (left: IndiaLocationValue, right: IndiaLocationValue) => left.state === right.state && left.city === right.city && left.pinCode === right.pinCode;

function locationFrom(value?: Partial<IndiaLocationValue>): IndiaLocationValue {
  const rawState = value?.state || "";
  const rawCity = value?.city || "";
  const rawPinCode = value?.pinCode || "";
  const city = findIndiaCityPinCodeOption(rawCity);
  const state = findIndiaState(rawState) || (city && (!rawState || city.state === rawState) ? city.state : rawState);
  const selectedCity = city && (!state || city.state === state) ? city.city : rawCity;
  return { state, city: selectedCity, pinCode: rawPinCode };
}

function LocationSuggestionList({ id, label, options, activeIndex, onChoose, emptyMessage }: { id: string; label: string; options: readonly string[]; activeIndex: number; onChoose: (value: string) => void; emptyMessage: string }) {
  return <div id={id} className="rac-location-options" role="listbox" aria-label={label}>{options.length ? options.map((option, index) => <button type="button" role="option" aria-selected={activeIndex === index} className={activeIndex === index ? "active" : ""} id={`${id}-${index}`} key={option} onPointerDown={(event) => event.preventDefault()} onClick={() => onChoose(option)}>{option}</button>) : <p>{emptyMessage}</p>}</div>;
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
  const lastEmitted = useRef<IndiaLocationValue | null>(null);
  const isControlled = value !== undefined;
  const controlledState = value?.state;
  const controlledCity = value?.city;
  const controlledPinCode = value?.pinCode;

  useEffect(() => {
    if (!isControlled) return;
    const next = locationFrom({ state: controlledState, city: controlledCity, pinCode: controlledPinCode });
    if (lastEmitted.current && sameLocation(next, lastEmitted.current)) return;
    setSelection(next);
    setStateQuery(next.state);
    setCityQuery(next.city);
    setPinCodeQuery(next.pinCode);
  }, [controlledCity, controlledPinCode, controlledState, isControlled]);

  const update = (next: IndiaLocationValue) => {
    setSelection(next);
    lastEmitted.current = next;
    onChange?.(next);
  };
  const stateSuggestions = useMemo(() => searchIndiaStates(stateQuery).slice(0, 8), [stateQuery]);
  const citySuggestions = useMemo(() => searchIndiaCities(cityQuery, visible.has("state") ? selection.state : "").slice(0, 8), [cityQuery, selection.state, visible]);
  const selectedCity = useMemo(() => findIndiaCityPinCodeOption(selection.city), [selection.city]);
  const pinCodeSuggestions = useMemo(() => {
    const knownPinCodes = selectedCity && (!visible.has("state") || !selection.state || selectedCity.state === selection.state) ? selectedCity.pinCodes : [];
    const legacyPinCodes = !knownPinCodes.length && selection.city === (defaultValue?.city || value?.city || "") && selection.pinCode ? [selection.pinCode] : [];
    return [...knownPinCodes, ...legacyPinCodes.filter((pinCode) => !knownPinCodes.includes(pinCode))].filter((pinCode) => pinCode.startsWith(pinCodeQuery.trim())).slice(0, 8);
  }, [defaultValue?.city, pinCodeQuery, selectedCity, selection.city, selection.pinCode, selection.state, value?.city, visible]);
  const cityEnabled = !visible.has("state") || Boolean(selection.state);
  const pinCodeEnabled = Boolean(selection.city);

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
  const chooseCity = (city: string) => {
    const option = findIndiaCityPinCodeOption(city);
    const state = visible.has("state") ? selection.state : option?.state || selection.state;
    setCityQuery(city);
    setPinCodeQuery("");
    update({ state, city, pinCode: "" });
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
  const navigate = (event: KeyboardEvent<HTMLInputElement>, options: readonly string[], activeIndex: number, setActiveIndex: (index: number) => void, choose: (option: string) => void, setOpen: (open: boolean) => void) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActiveIndex(options.length ? (activeIndex + 1) % options.length : -1); return; }
    if (event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActiveIndex(options.length ? (activeIndex - 1 + options.length) % options.length : -1); return; }
    if (event.key === "Enter" && activeIndex >= 0 && options[activeIndex]) { event.preventDefault(); choose(options[activeIndex]); return; }
    if (event.key === "Escape") { setOpen(false); setActiveIndex(-1); }
  };

  const stateField = visible.has("state") && <div className="rac-location-field"><label htmlFor={stateInputId}>State</label>{readOnly ? <input id={stateInputId} name="state" readOnly value={selection.state} /> : <div className="rac-location-combobox"><input id={stateInputId} value={stateQuery} autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={stateOpen && Boolean(stateQuery.trim())} aria-controls={stateListId} aria-activedescendant={activeStateIndex >= 0 ? `${stateListId}-${activeStateIndex}` : undefined} onFocus={() => setStateOpen(true)} onBlur={() => window.setTimeout(() => setStateOpen(false), 120)} onChange={(event) => { setStateQuery(event.target.value); setCityQuery(""); setPinCodeQuery(""); update(emptyLocation); setStateOpen(true); setActiveStateIndex(-1); }} onKeyDown={(event) => navigate(event, stateSuggestions, activeStateIndex, setActiveStateIndex, chooseState, setStateOpen)} placeholder="Start typing a state" /><input type="hidden" name="state" value={selection.state} />{stateOpen && stateQuery.trim() && <LocationSuggestionList id={stateListId} label="Matching states" options={stateSuggestions} activeIndex={activeStateIndex} onChoose={chooseState} emptyMessage="No matching states found" />}</div>}</div>;
  const cityField = visible.has("city") && <div className="rac-location-field"><label htmlFor={cityInputId}>City</label>{readOnly ? <input id={cityInputId} name="city" readOnly value={selection.city} /> : <div className="rac-location-combobox"><input id={cityInputId} value={cityQuery} disabled={!cityEnabled} autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={cityOpen && Boolean(cityQuery.trim())} aria-controls={cityListId} aria-activedescendant={activeCityIndex >= 0 ? `${cityListId}-${activeCityIndex}` : undefined} onFocus={() => setCityOpen(true)} onBlur={() => window.setTimeout(() => setCityOpen(false), 120)} onChange={(event) => { setCityQuery(event.target.value); setPinCodeQuery(""); update({ ...selection, city: "", pinCode: "" }); setCityOpen(true); setActiveCityIndex(-1); }} onKeyDown={(event) => navigate(event, citySuggestions.map((option) => option.city), activeCityIndex, setActiveCityIndex, chooseCity, setCityOpen)} placeholder={cityEnabled ? "Start typing a city" : "Select state first"} /><input type="hidden" name="city" value={selection.city} />{cityOpen && cityQuery.trim() && <LocationSuggestionList id={cityListId} label="Matching cities" options={citySuggestions.map((option) => option.city)} activeIndex={activeCityIndex} onChoose={chooseCity} emptyMessage="No matching cities found" />}</div>}</div>;
  const pinCodeField = visible.has("pinCode") && <div className="rac-location-field"><label htmlFor={pinCodeInputId}>PIN code</label>{readOnly ? <input id={pinCodeInputId} name="pinCode" readOnly value={selection.pinCode} /> : <div className="rac-location-combobox"><input id={pinCodeInputId} value={pinCodeQuery} disabled={!pinCodeEnabled} autoComplete="off" inputMode="numeric" role="combobox" aria-autocomplete="list" aria-expanded={pinCodeOpen && pinCodeEnabled} aria-controls={pinCodeListId} aria-activedescendant={activePinCodeIndex >= 0 ? `${pinCodeListId}-${activePinCodeIndex}` : undefined} onFocus={() => setPinCodeOpen(true)} onBlur={() => window.setTimeout(() => setPinCodeOpen(false), 120)} onChange={(event) => { setPinCodeQuery(event.target.value); update({ ...selection, pinCode: "" }); setPinCodeOpen(true); setActivePinCodeIndex(-1); }} onKeyDown={(event) => navigate(event, pinCodeSuggestions, activePinCodeIndex, setActivePinCodeIndex, choosePinCode, setPinCodeOpen)} placeholder={pinCodeEnabled ? "Search and select PIN code" : "Select city first"} /><input type="hidden" name="pinCode" value={selection.pinCode} />{pinCodeOpen && pinCodeEnabled && <LocationSuggestionList id={pinCodeListId} label={`PIN codes for ${selection.city}`} options={pinCodeSuggestions} activeIndex={activePinCodeIndex} onChoose={choosePinCode} emptyMessage="No PIN codes found for this city" />}</div>}</div>;

  return <>{stateField}{cityField}{pinCodeField}</>;
}
