import api from "./api";

const data = (response) => ({ data: response.data.data });
const requestResult = (response) => ({ data: { request: response.data.data } });

export async function getRequests() {
  return data(await api.get("/travel"));
}

export async function getAllRequests() {
  return getRequests();
}

export async function raiseRequest(request) {
  const payload = {
    destination: request.destination,
    startDate: request.startDate,
    endDate: request.endDate,
    purpose: request.purpose,
    mode: request.mode,
    estimatedCost: request.estimatedCost,
    isInternational: request.isInternational,
  };
  return data(await api.post("/travel", payload));
}

export async function resubmitRequest(id, payload) {
  return data(await api.patch(`/travel/${id}/resubmit`, payload));
}

export async function managerDecision(id, approved, _by, comment) {
  return requestResult(await api.patch(`/travel/${id}/decision`, { action: approved ? "APPROVE" : "REJECT", comment }));
}

export async function requestMoreDetails(id, comment) {
  return requestResult(await api.patch(`/travel/${id}/decision`, { action: "REQUEST_MORE_DETAILS", comment }));
}

export async function financeDecision(id, approved, _by, comment) {
  return requestResult(await api.patch(`/travel/${id}/decision`, { action: approved ? "APPROVE" : "REJECT", comment }));
}

export async function attemptApiBooking(id, options = {}) {
  const response = await api.patch(`/travel/${id}/booking`, { mode: "api", simulateFailure: Boolean(options.simulateFailure) });
  return { data: { request: response.data.data.data, apiFailed: response.data.data.apiFailed } };
}

export async function confirmManualBooking(id, reference) {
  return requestResult(await api.patch(`/travel/${id}/booking`, { mode: "manual", reference }));
}

export async function disburseAdvance(id, amount) {
  return requestResult(await api.patch(`/travel/${id}/advance`, { amount: Number(amount) }));
}

export async function submitSettlement(id, actualCost, notes) {
  return data(await api.patch(`/travel/${id}/settlement`, { actualCost: Number(actualCost), notes }));
}

export async function resolveSettlementBalance(id, method, note) {
  return requestResult(await api.patch(`/travel/${id}/settlement/close`, { method, note }));
}

export async function closeZeroBalanceSettlement(id) {
  return requestResult(await api.patch(`/travel/${id}/settlement/close`, {}));
}

export async function getMaskedPassportRef() {
  return data(await api.get("/travel/passport"));
}
