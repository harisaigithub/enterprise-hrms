const BASE = "http://localhost:4000/api";
let failures = 0;

async function call(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

function check(name, cond, extra = "") {
  if (cond) console.log(`PASS ${name}`);
  else { failures++; console.log(`FAIL ${name} ${extra}`); }
}

(async () => {
  const login = await call("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "robert.king@company.com", password: "Password@123" }),
  });
  check("login admin", login.status === 200 && login.body?.data?.token, JSON.stringify(login.body));
  const token = login.body?.data?.token;
  const auth = { Authorization: `Bearer ${token}` };

  const me = await call("/auth/me", { headers: auth });
  check("auth/me", me.status === 200 && me.body?.data?.user?.id === "EMP010", JSON.stringify(me.body));

  const emp = await call("/employees?page=1&limit=5&department=Engineering", { headers: auth });
  check("employees list", emp.status === 200 && emp.body?.data?.length > 0 && typeof emp.body?.total === "number", JSON.stringify(emp.body));

  const empOne = await call("/employees/EMP001", { headers: auth });
  check("employee by code", empOne.status === 200 && empOne.body?.data?.id === "EMP001", JSON.stringify(empOne.body));

  const att = await call("/attendance?page=1&limit=5", { headers: auth });
  check("attendance list", att.status === 200 && Array.isArray(att.body?.data), JSON.stringify(att.body));

  const lv = await call("/leave/types", { headers: auth });
  check("leave types", lv.status === 200 && Array.isArray(lv.body?.data) && lv.body?.data?.length > 0, JSON.stringify(lv.body));

  const bal = await call("/leave/balance", { headers: auth });
  check("leave balance", bal.status === 200 && Array.isArray(bal.body?.data), JSON.stringify(bal.body));

  const pr = await call("/payroll/runs", { headers: auth });
  check("payroll runs", pr.status === 200 && Array.isArray(pr.body?.data), JSON.stringify(pr.body));

  const ps = await call("/payroll/payslips?employeeId=EMP001", { headers: auth });
  check("payslips", ps.status === 200 && Array.isArray(ps.body?.data), JSON.stringify(ps.body));

  const search = await call("/search?q=singh", { headers: auth });
  check("search", search.status === 200 && Array.isArray(search.body?.data), JSON.stringify(search.body));

  const noAuth = await call("/employees");
  check("no-auth rejected", noAuth.status === 401, JSON.stringify(noAuth.body));

  const rbac = await call("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken: login.body?.data?.refreshToken }),
  });
  check("refresh rotation", rbac.status === 200 && !!rbac.body?.data?.token, JSON.stringify(rbac.body));

  console.log(failures === 0 ? "\nALL SMOKE TESTS PASSED" : `\n${failures} FAILURES`);
  process.exit(failures === 0 ? 0 : 1);
})();
