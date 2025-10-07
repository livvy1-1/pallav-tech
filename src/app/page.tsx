import dynamic from 'next/dynamic';
const CallFeedback = dynamic(() => import('./CallFeedback'), { ssr: false });

export default function Home() {
  return <CallFeedback />;
}