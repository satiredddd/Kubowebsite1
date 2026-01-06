import React, {useState} from 'react'
import { useNavigate } from 'react-router-dom' 
import './Login.css'

import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase'

import emailIcon from '../../assets/email.png'
import passwordIcon from '../../assets/pass.png'
import loginImage from '../../assets/logi.png' 

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const navigate = useNavigate(); 

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;

          console.log('=== LOGIN DEBUG ===');
          console.log('User UID:', user.uid);
          console.log('User Email:', user.email);
          
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          console.log('Document Path:', `users/${user.uid}`);
          console.log('Document exists?', userDoc.exists());
          
          if (!userDoc.exists()) {
            await auth.signOut();
            setError(`Access Denied. No user document found for UID: ${user.uid}. Please contact admin.`);
            console.error('User document does not exist in Firestore');
            setLoading(false);
            return;
          }

          const userData = userDoc.data();
          console.log('Full User Data:', JSON.stringify(userData, null, 2));
          console.log('Role field exists?', 'role' in userData);
          console.log('Role value:', userData.role);
          console.log('Role type:', typeof userData.role);
          
          // Check if user is admin OR staff
          if (userData.role !== 'admin' && userData.role !== 'staff') {
            await auth.signOut(); 
            setError(`Access denied. Admin or Staff privileges required. Your role: ${userData.role || 'not set'}`);
            console.error('User does not have admin or staff role');
            setLoading(false);
            return;
          } 

          // ✅ UPDATE LAST ACTIVE TIMESTAMP
          await updateDoc(userDocRef, {
            lastActive: new Date(),
            isOnline: true
          });

          console.log(`✅ ${userData.role} logged in successfully`);
          console.log('=== END DEBUG ===');
          
          // Navigate to dashboard for both admin and staff
          navigate('/dashboard');

        } catch (error) {
          console.error('Login error:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          
          if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            setError('Invalid email or password');
          } else {
            setError(`Login failed: ${error.message}`);
          }
        } finally {
          setLoading(false);
        }
    };

    return (
        <div className="login-page-wrapper">
            <div className='container'>
                <div className="image-section">
                    <img src={loginImage} alt="Login illustration" />
                </div>

                <div className="form-section">
                    <div className="header">
                        <div className="text">Login as Kubo PH</div>
                        <div className="underline"></div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {error && <div className="error-message">{error}</div>}
                        
                        <div className="inputs">
                            <div className="input">
                                <img src={emailIcon} alt="email" />
                                <input 
                                    type="email" 
                                    placeholder="Email Address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </div>
                            
                            <div className="input">
                                <img src={passwordIcon} alt="password" />
                                <input 
                                    type="password" 
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="forgot-password">
                            Forgot Password? <span>Click Here!</span>
                        </div>

                        <div className="submit-container">
                            <button type="submit" className="submit" disabled={loading}>
                                {loading ? 'LOGGING IN...' : 'L O G I N'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;