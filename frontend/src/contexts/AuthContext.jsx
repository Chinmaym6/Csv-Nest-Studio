
// frontend/src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);
                                //
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate              = useNavigate();

  // On mount: if we have a token, verify it and fetch user ID
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.get('/protected')
      .then(res => {
        // extract userId from your protected endpoint’s message
        const id = Number(res.data.message.match(/user (\d+)/)[1]);
        setUser({ id });
      })
      .catch(() => {
        // invalid or expired token
        localStorage.removeItem('token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // Sign up: receive token, store it, set user
  const signup = async (name, email, password) => {
    const res = await api.post('/signup', { name, email, password });
    const { token } = res.data;
    localStorage.setItem('token', token);

    // immediately verify and set user
    const p = await api.get('/protected');
    const id = Number(p.data.message.match(/user (\d+)/)[1]);
    setUser({ id });

    navigate('/dashboard');
  };

  // Log in: receive token, store it, set user
  const login = async (email, password) => {
    const res = await api.post('/login', { email, password });
    const { token } = res.data;
    localStorage.setItem('token', token);

    // fetch user ID
    const p = await api.get('/protected');
    const id = Number(p.data.message.match(/user (\d+)/)[1]);
    setUser({ id });

    navigate('/dashboard');
  };

  // Log out: client-side only
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}





// frontend/src/contexts/AuthContext.jsx
// import React, { createContext, useContext, useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import api from '../api';
// import '../components/Auth.css';

// const AuthContext = createContext();
// export const useAuth = () => useContext(AuthContext);

// export function AuthProvider({ children }) {
//   const [user, setUser]     = useState(null);
//   const [loading, setLoading] = useState(true);    // ← new
//   const navigate            = useNavigate();

  // On mount, verify existing session
  // useEffect(() => {
  //   api.get('/protected')
  //     .then(res => {
  //       const id = res.data.message.match(/user (\d+)/)[1];
  //       setUser({ id });
  //     })
  //     .catch(() => {
  //       setUser(null);
  //     })
  //     .finally(() => {
  //       setLoading(false);  // ← done checking
  //     });
  // }, []);

  // const signup = async (name, email, password) => {
  //   await api.post('/signup', { name, email, password });
  //   navigate('/login');
  // };

  // const login = async (email, password) => {
  //   await api.post('/login', { email, password });
    // re-fetch user ID
//     const res = await api.get('/protected');
//     const id  = res.data.message.match(/user (\d+)/)[1];
//     setUser({ id });
//     navigate('/dashboard');
//   };

//   const logout = async () => {
//     await api.post('/logout');
//     setUser(null);
//     navigate('/login');
//   };

//   return (
//     <AuthContext.Provider value={{ user, loading, signup, login, logout }}>
//       {children}
//     </AuthContext.Provider>
//   );
// }
