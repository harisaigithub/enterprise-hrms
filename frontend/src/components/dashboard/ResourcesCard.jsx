import { resources} from "../../data/resources";

export default function ResourcesCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">

      <h2 className="text-lg font-semibold mb-5">
        Resources
      </h2>

      <div className="space-y-3">

        {resources.map((item) => (
          <div
            key={item}
            className="flex justify-between border rounded-xl px-4 py-3 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
          >
            <span>{item}</span>

            <span>→</span>

          </div>
        ))}

      </div>

    </div>
  );
}