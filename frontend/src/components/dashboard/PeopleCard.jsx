import { people } from "../../data/people";

export default function PeopleCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
      <h2 className="text-lg font-semibold mb-5">People</h2>

      <div className="grid grid-cols-4 gap-6">
        {people.map((person) => (
          <div key={person.name} className="text-center">
            <img
              src={person.img}
              alt={person.name}
              className="w-20 h-20 rounded-full border-4 border-white shadow hover:scale-110 transition-all duration-300"
            />

            <p className="text-sm font-medium mt-2 truncate">
              {person.name}
            </p>
          </div>
        ))}
      </div>

      <button className="mt-6 w-full bg-[#ff7a1a] hover:bg-[#ff8d3a] text-white py-3 rounded-xl font-semibold hover:scale-105 transition-all duration-300">
        See all 32 people →
      </button>
    </div>
  );
}