import ScoreStack from '../components/ScoreStack';

export default {
  title: 'Components/ScoreStack',
  component: ScoreStack,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    positionClass: {
      control: 'select',
      options: ['stack-self', 'stack-left', 'stack-top', 'stack-right'],
    },
  },
  decorators: [
    (Story) => (
      <div style={{ 
        width: '600px', 
        height: '400px', 
        background: 'radial-gradient(circle at center, #1e5a2e 0%, #143d22 100%)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Story />
      </div>
    ),
  ],
};

export const Default = {
  args: {
    player: {
      name: 'Ahmed',
      score: 150,
      hand: 5,
      scoreStack: ['As', 'Kd', '10h'],
      lockedRanks: ['A'],
    },
    isSelf: true,
    isCurrentTurn: true,
    positionClass: 'stack-self',
  },
};

export const Opponent = {
  args: {
    player: {
      name: 'Opponent 1',
      score: 80,
      hand: 3,
      scoreStack: ['5c', '7s'],
      lockedRanks: [],
    },
    isSelf: false,
    isCurrentTurn: false,
    positionClass: 'stack-left',
  },
};

export const EmptyStack = {
  args: {
    player: {
      name: 'New Player',
      score: 0,
      hand: 7,
      scoreStack: [],
      lockedRanks: [],
    },
    isSelf: false,
    isCurrentTurn: false,
    positionClass: 'stack-right',
  },
};
