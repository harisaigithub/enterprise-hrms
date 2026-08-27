import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ShieldCheck, ShieldX } from "lucide-react";
import { verifyCertificate } from "../../services/lmsService";

export default function CertificateVerificationPage() {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!token) {
      setData({
        verified: false,
        message: "Invalid verification link.",
      });
      setLoading(false);
      return;
    }

    verifyCertificate(token)
      .then((res) => {
        console.log("VERIFY RESPONSE:", res);
        setData(res);
      })
      .catch((err) => {
        setData({
          verified: false,
          message:
            err.response?.data?.message ||
            "Certificate could not be verified.",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <div
        style={{
          maxWidth: 600,
          margin: "80px auto",
          textAlign: "center",
        }}
      >
        Verifying certificate...
      </div>
    );
  }

  if (!data?.verified) {
    return (
      <div
        style={{
          maxWidth: 600,
          margin: "80px auto",
          padding: 32,
          textAlign: "center",
        }}
      >
        <ShieldX
          size={64}
          color="var(--red)"
        />

        <h1>Certificate Not Valid</h1>

        <p>
          {data?.message ||
            "This certificate could not be verified."}
        </p>
      </div>
    );
  }

  const certificate = data.data;

  return (
    <div
      style={{
        maxWidth: 700,
        margin: "60px auto",
        padding: 32,
        border: "1px solid var(--border)",
        borderRadius: 16,
        textAlign: "center",
        background: "var(--card)",
      }}
    >
      <ShieldCheck
        size={64}
        color="var(--green)"
      />

      <h1>Certificate Verified</h1>

      <p>
        This certificate is authentic and was
        issued by the organization.
      </p>

      <hr />

      <h2>{certificate.employeeName}</h2>

      <p>
        Course:{" "}
        <strong>
          {certificate.courseName}
        </strong>
      </p>

      {certificate.courseCode && (
        <p>
          Course Code:{" "}
          <strong>
            {certificate.courseCode}
          </strong>
        </p>
      )}

      <p>
        Certificate No:{" "}
        <strong>
          {certificate.certificateNumber}
        </strong>
      </p>

      <p>
        Issued:{" "}
        {new Date(
          certificate.issuedDate
        ).toLocaleDateString("en-IN")}
      </p>

      <div
        style={{
          marginTop: 20,
          padding: 12,
          borderRadius: 8,
          background: "#ecfdf5",
          color: "var(--green)",
          fontWeight: 700,
        }}
      >
        ✓ AUTHENTIC CERTIFICATE
      </div>
    </div>
  );
}