import { user } from "../../data/user";

export default function WelcomeCard() {
  return (
    <div className="mb-8">

      <h1 className="text-5xl font-bold text-gray-800">
        {user.greeting}, {user.firstName} 👋
      </h1>

      <p className="text-gray-500 text-xl mt-2">
        Here's what you need to focus on today
      </p>

    </div>
  );
}