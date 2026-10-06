import api from "./api";

const data = (response) => ({ data: response.data.data });
const requestResult = (response) => ({ data: { request: response.data.data } });
const bookingResult = (response) => ({
  data: {
    request: response.data.data.request,
    apiFailed: response.data.data.apiFailed,
  },
});

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

export async function editPendingTravelRequest(id, payload) {
  return data(await api.patch(`/travel/${id}/edit`, payload));
}

export async function cancelTravelRequest(id, reason) {
  return data(await api.patch(`/travel/${id}/cancel`, { reason }));
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
  return bookingResult(response);
}

export async function confirmManualBooking(id, reference) {
  return bookingResult(await api.patch(`/travel/${id}/booking`, { mode: "manual", reference }));
}

export async function disburseAdvance(id, amount) {
  return requestResult(await api.patch(`/travel/${id}/advance`, { amount: Number(amount) }));
}

export async function submitSettlement(id, actualCost, notes, itemization = []) {
  return data(await api.patch(`/travel/${id}/settlement`, { actualCost: Number(actualCost), notes, itemization }));
}

export async function resolveSettlementBalance(id, method, note, reference) {
  return requestResult(await api.patch(`/travel/${id}/settlement/close`, { method, note, reference }));
}

export async function closeZeroBalanceSettlement(id) {
  return requestResult(await api.patch(`/travel/${id}/settlement/close`, {}));
}

export async function getMaskedPassportRef() {
  return data(await api.get("/travel/passport"));
}
