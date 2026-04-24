import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  FaCheck,
  FaSearch,
  FaTimes,
  FaUserFriends,
  FaUsers,
} from "react-icons/fa";
import { buildImageUrl } from "../utils/media";

const url = import.meta.env.VITE_URL || "http://localhost:5000";

const ForwardModal = ({ message, currentUserId, onClose, onForward }) => {
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTab, setSelectedTab] = useState("friends");

  useEffect(() => {
    fetchDestinations();
  }, []);

  const fetchDestinations = async () => {
    try {
      const token = localStorage.getItem("token");
      const [friendsRes, groupsRes] = await Promise.all([
        axios.get(`${url}/api/auth/friends`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${url}/api/groups/my-groups`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setFriends(friendsRes.data);
      setGroups(groupsRes.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  const handleForward = (destinationId, isGroup) => {
    onForward(message, destinationId, isGroup);
    onClose();
  };

  const filteredFriends = friends.filter((friend) =>
    friend.username.toLowerCase().includes(search.toLowerCase())
  );
  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/55 backdrop-blur-md animate-fade-in">
      <div className="mx-4 w-full max-w-md rounded-[30px] border border-stone-200/80 bg-white/92 shadow-2xl backdrop-blur-lg scale-in dark:border-stone-700 dark:bg-stone-900/90">
        <div className="flex items-center justify-between border-b border-stone-200/70 p-5 dark:border-stone-700">
          <h3
            className="text-xl font-semibold text-stone-900 dark:text-stone-100"
            style={{ fontFamily: '"Sora", sans-serif' }}
          >
            Forward Message
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-2 transition hover:scale-105 hover:bg-stone-200 dark:hover:bg-stone-700"
            aria-label="Close"
          >
            <FaTimes className="text-stone-500 dark:text-stone-400" />
          </button>
        </div>

        <div className="border-b border-stone-200/70 p-4 dark:border-stone-700">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-2xl border border-stone-300 bg-white py-2.5 pl-9 pr-4 outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200 dark:border-stone-700 dark:bg-stone-800/50 dark:text-white dark:focus:border-stone-500 dark:focus:ring-stone-700"
              autoFocus
            />
          </div>
        </div>

        <div className="flex border-b border-stone-200 dark:border-stone-700">
          <button
            onClick={() => setSelectedTab("friends")}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-center font-semibold transition ${
              selectedTab === "friends"
                ? "border-b-2 border-amber-500 bg-amber-50/70 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                : "text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
            }`}
          >
            <FaUserFriends />
            Friends
          </button>
          <button
            onClick={() => setSelectedTab("groups")}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-center font-semibold transition ${
              selectedTab === "groups"
                ? "border-b-2 border-amber-500 bg-amber-50/70 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                : "text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
            }`}
          >
            <FaUsers />
            Groups
          </button>
        </div>

        <div className="max-h-80 space-y-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            </div>
          ) : selectedTab === "friends" ? (
            filteredFriends.length === 0 ? (
              <p className="py-8 text-center text-stone-500 dark:text-stone-400">
                No friends found
              </p>
            ) : (
              filteredFriends.map((friend) => (
                <div
                  key={friend._id}
                  onClick={() => handleForward(friend._id, false)}
                  className="group flex cursor-pointer items-center gap-3 rounded-2xl p-3 transition hover:scale-[1.02] hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  <img
                    src={buildImageUrl(friend.image)}
                    className="h-10 w-10 rounded-full object-cover"
                    alt={friend.username}
                  />
                  <span className="flex-1 font-medium text-stone-800 dark:text-white">
                    {friend.username}
                  </span>
                  <FaCheck className="text-amber-700 opacity-0 transition group-hover:opacity-100 dark:text-amber-300" />
                </div>
              ))
            )
          ) : filteredGroups.length === 0 ? (
            <p className="py-8 text-center text-stone-500 dark:text-stone-400">
              No groups found
            </p>
          ) : (
            filteredGroups.map((group) => (
              <div
                key={group._id}
                onClick={() => handleForward(group._id, true)}
                className="group flex cursor-pointer items-center gap-3 rounded-2xl p-3 transition hover:scale-[1.02] hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <img
                  src={buildImageUrl(group.avatar)}
                  className="h-10 w-10 rounded-full object-cover"
                  alt={group.name}
                />
                <span className="flex-1 font-medium text-stone-800 dark:text-white">
                  {group.name}
                </span>
                <FaCheck className="text-amber-700 opacity-0 transition group-hover:opacity-100 dark:text-amber-300" />
              </div>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }
        .scale-in {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ForwardModal;
