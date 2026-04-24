import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  FaCheckCircle,
  FaImage,
  FaSearch,
  FaTimes,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa";
import { buildImageUrl } from "../utils/media";

const url = import.meta.env.VITE_URL || "http://localhost:5000";

const CreateGroupModal = ({ isOpen, onClose, onGroupCreated, userId }) => {
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (isOpen && userId) {
      fetchFriends();
      resetForm();
    }
  }, [isOpen, userId]);

  const resetForm = () => {
    setGroupName("");
    setDescription("");
    setAvatar(null);
    setAvatarPreview(null);
    setSelectedMembers([]);
    setSearchTerm("");
  };

  const fetchFriends = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${url}/api/auth/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFriends(response.data);
    } catch (error) {
      console.error("Error fetching friends:", error);
      toast.error("Could not load friends list");
    }
  };

  const handleMemberToggle = (friendId) => {
    setSelectedMembers((previous) =>
      previous.includes(friendId)
        ? previous.filter((id) => id !== friendId)
        : [...previous, friendId]
    );
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!groupName.trim()) {
      toast.error("Group name is required");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("name", groupName);
    formData.append("description", description);
    if (avatar) formData.append("avatar", avatar);
    formData.append("members", JSON.stringify(selectedMembers));

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${url}/api/groups/create`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success("Group created successfully!");
      onGroupCreated(response.data);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  const filteredFriends = friends.filter((friend) =>
    friend.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/55 backdrop-blur-md animate-fade-in">
      <div className="mx-4 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[30px] border border-stone-200/80 bg-white/92 shadow-2xl backdrop-blur-lg scale-in dark:border-stone-700 dark:bg-stone-900/90">
        <div className="sticky top-0 flex items-center justify-between border-b border-stone-200/70 bg-white/80 p-5 backdrop-blur-sm dark:border-stone-700 dark:bg-stone-900/80">
          <div className="flex items-center gap-2">
            <FaUsers className="text-xl text-amber-700 dark:text-amber-300" />
            <h2
              className="text-xl font-semibold text-stone-900 dark:text-stone-100"
              style={{ fontFamily: '"Sora", sans-serif' }}
            >
              Create New Group
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 transition hover:scale-105 hover:bg-stone-200 dark:hover:bg-stone-700"
            aria-label="Close"
          >
            <FaTimes className="text-stone-500 dark:text-stone-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-stone-700 dark:text-stone-300">
              Group Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-200 dark:border-stone-700 dark:bg-stone-800/50 dark:text-white dark:focus:border-stone-500 dark:focus:ring-stone-700"
              placeholder="Enter group name"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-stone-700 dark:text-stone-300">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full resize-none rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-200 dark:border-stone-700 dark:bg-stone-800/50 dark:text-white dark:focus:border-stone-500 dark:focus:ring-stone-700"
              rows="2"
              placeholder="What's this group about?"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-stone-700 dark:text-stone-300">
              Group Avatar (optional)
            </label>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-stone-200 shadow-inner dark:bg-stone-700">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-stone-400">
                    <FaImage size={24} />
                  </div>
                )}
              </div>
              <label className="flex-1 cursor-pointer">
                <div className="rounded-2xl border border-stone-300 bg-stone-100 px-4 py-3 text-center text-sm font-medium text-stone-700 transition hover:bg-white dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700">
                  Choose Image
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
              <FaUserPlus className="text-amber-700 dark:text-amber-300" />
              Add Members
            </label>

            <div className="relative mb-2">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400" />
              <input
                type="text"
                placeholder="Search friends..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-2xl border border-stone-300 bg-white py-2.5 pl-9 pr-4 outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200 dark:border-stone-700 dark:bg-stone-800/50 dark:text-white dark:focus:border-stone-500 dark:focus:ring-stone-700"
              />
            </div>

            <div className="max-h-48 space-y-1 overflow-y-auto rounded-2xl border border-stone-200 bg-stone-50/70 p-2 dark:border-stone-700 dark:bg-stone-800/30">
              {filteredFriends.length === 0 ? (
                <p className="py-4 text-center text-sm text-stone-500 dark:text-stone-400">
                  No friends found
                </p>
              ) : (
                filteredFriends.map((friend) => (
                  <label
                    key={friend._id}
                    className="group flex cursor-pointer items-center rounded-xl p-2 transition hover:bg-stone-200 dark:hover:bg-stone-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(friend._id)}
                      onChange={() => handleMemberToggle(friend._id)}
                      className="h-4 w-4 rounded border-stone-300 bg-gray-100 text-amber-700 focus:ring-amber-500 dark:border-stone-600 dark:bg-stone-700 dark:focus:ring-amber-400"
                    />
                    <img
                      src={buildImageUrl(friend.image)}
                      alt={friend.username}
                      className="mx-3 h-8 w-8 rounded-full object-cover"
                      onError={(event) => {
                        event.target.src = "/default-avatar.png";
                      }}
                    />
                    <span className="flex-1 text-sm font-medium text-stone-800 dark:text-white">
                      {friend.username}
                    </span>
                    {selectedMembers.includes(friend._id) && (
                      <FaCheckCircle className="text-sm text-amber-700 dark:text-amber-300" />
                    )}
                  </label>
                ))
              )}
            </div>

            <p className="mt-2 flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
              <FaUsers size={10} /> You will be added automatically as admin.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-stone-300 px-4 py-3 font-medium text-stone-700 transition hover:scale-[1.02] hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-2xl bg-stone-900 py-3 font-semibold uppercase tracking-[0.18em] text-white shadow-md transition hover:bg-stone-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-stone-950 dark:border-t-transparent" />
                  Creating...
                </div>
              ) : (
                "Create Group"
              )}
            </button>
          </div>
        </form>
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

export default CreateGroupModal;
