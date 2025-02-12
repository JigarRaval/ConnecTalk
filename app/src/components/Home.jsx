import  { useEffect, useState,useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import io from 'socket.io-client'
import { Helmet } from 'react-helmet'


const url = import.meta.env.VITE_URL;

const socket = io(url);

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const { username, image, userId } = location.state || {};
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    const fetchUsers = async () => {
      try {
        const res = await axios.get(
          `${url}/api/auth/users`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setUsers(res.data);
      } catch (err) {
        console.error("Error fetching users", err);
      }
    };
    fetchUsers();

    socket.on("receive_message", (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    socket.on("messages_deleted", ({ userId: senderId, selectedUserId }) => {
      if (
        (userId === senderId &&
          selectedUser &&
          selectedUser._id === selectedUserId) ||
        (userId === selectedUserId &&
          selectedUser &&
          selectedUser._id === senderId)
      ) {
        setMessages([]);
      }
    });
    return () => {
      socket.off("receive_message");
      socket.off("messages_deleted");
    };
  }, [selectedUser, userId, navigate]);

  useEffect(() => {
    if (userId) {
      socket.emit("join_room", userId);
    }
  }, [userId]);

  useEffect(() => {
    if (selectedUser) {
      const fetchMessages = async () => {
        try {
          const res = await axios.get(
            `${url}/api/auth/messages/${userId}/${selectedUser._id}`
          );

          setMessages(res.data);
        } catch (err) {
          console.error("Error fetching messages", err);
        }
      };
      fetchMessages();
    }
  });
  useEffect(() => {
    if (isAtBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAtBottom]);

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setIsAtBottom(scrollHeight - scrollTop === clientHeight);
    }
  };

  const handleSendMessage = () => {
    if (message.trim() && selectedUser) {
      const msg = {
        from: userId,
        to: selectedUser._id,
        content: message,
        timestamp: new Date().toISOString(),
      };
      socket.emit("send_message", msg);
      setMessages((prevMessages) => [...prevMessages, msg]);
      setMessage("");
    } else {
      console.error("Message not sent");
    }
  };

  const deleteAllMessages = async () => {
    if (!selectedUser) return;
    try {
      await axios.delete(
        `${url}/api/auth/messages/${userId}/${selectedUser._id}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      setMessages([]);
    } catch (err) {
      console.error("Error deleting messages", err);
    }
  };
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/Register");
  };

  return (
    <div className="home-container flex w-screen   ">
      <Helmet>
        <title>BuzzTalk - chat</title>
      </Helmet>
      <div className="sidebar  w-1/3 lg:w-1/6  lg:px-10 min-h-screen  border-r-2 pt-5 ">
        <div className="profile-section flex flex-col  w-full mb-5 ">
          <div className="info flex mb-4 items-center lg:mb-5 justify-center ">
            <img
              src={`${url}/${image}`}
              className="profile-image"
            ></img>
            <span className="username font-bold text-2xl ">{username}</span>
          </div>
          <button
            className="logout-button rounded-2xl p-2 w-fit m-auto "
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
        <hr className="my-4 hr" />
        <ul className="user-list">
          {users
            .filter((user) => user._id !== userId)
            .map((user) => (
              <li
                className="user-item flex  items-center  justify-start p-2 mb-1 w-full "
                key={user._id}
                onClick={() => setSelectedUser(user)}
              >
                <img
                  src={`${url}/${user.image}`}
                  className="user-image w-10 h-10 rounded-3xl mr-3"
                ></img>
                <span className="user-username">{user.username}</span>
              </li>
            ))}
        </ul>
        <div className="app-header fixed bottom-0 flex  justify-center items-center h-10 w-">
          <img
            className="w-10 h-10"
            src="src/assets/vecteezy_3d-rendering-of-speech-bubble-icons-3d-pastel-chat-icon_29108221.png"
            alt=""
          />
          <h1 className=" ">BuzzTalk</h1>
        </div>
      </div>
      <div className="content w-2/3 lg:w-5/6    ">
        {selectedUser ? (
          <div className="chat-container flex flex-col h-screen relative ">
            <div className="profile-section profile border-b-2 flex items-center mb-0  p-4 h-18 sticky top-0 ">
              <img
                src={`${url}/${selectedUser.image}`}
                className="profile-image"
              ></img>
              <span className="username">{selectedUser.username}</span>
            </div>
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="messages max-w-screen overflow-y-auto pb-10 pt-3"
            >
              {messages
                .filter(
                  (msg) =>
                    (msg.from === userId && msg.to === selectedUser._id) ||
                    (msg.from === selectedUser._id && msg.to === userId)
                )
                .map((msg, index) => (
                  <div
                    key={index}
                    className={`message mb-2  flex items-center  ${
                      msg.from === userId ? "sent" : "received"
                    }`}
                  >
                    <img
                      className="w-8 h-8 rounded-2xl mx-3"
                      src={`${url}/${
                        msg.from === userId ? image : selectedUser.image
                      }`}
                    ></img>
                    <p className="p-3">{msg.content}</p>
                    <div className="timestamp">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </div>
                  </div>
                ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="message-input flex w-full sticky bottom-0 py-5 px-2 items-center   ">
              <input
                type="text"
                className="w-5/6"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Typea message"
              ></input>
              <button
                className=" lg:w-1/12 lg:mx-5 mx-2 "
                onClick={handleSendMessage}
              >
                Send
              </button>
              <button className="lg:w-1/12 mr-0 " onClick={deleteAllMessages}>
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="no-chat flex  flex-col h-screen justify-center items-center ml-3 lg:ml-0">
            <div className="img w-60 lg:w-80 h-60 lg:h-80 ">
              <img
                src="src/assets/vecteezy_3d-transparent-icon-of-people_46454918.png"
                alt=""
              />
            </div>
            <p>Hey there! Start chatting with your friends now!</p>
          </div>
        )}
      </div>
    </div>
  );
}

