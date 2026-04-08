import { useNavigate } from 'react-router-dom';
import RaceSelect from '../components/RaceSelect';

export default function RaceSelectPage() {
  const navigate = useNavigate();

  const handleSelectRace = (year: number, round: number) => {
    navigate(`/race/${year}/${round}`);
  };

  return <RaceSelect onSelectRace={handleSelectRace} />;
}
