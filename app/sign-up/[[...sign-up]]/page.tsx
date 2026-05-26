import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 1rem' }}>
      <SignUp />
    </div>
  );
}
