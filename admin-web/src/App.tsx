import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AppRouter from './router';

export default function App() {
  return (
    <ConfigProvider 
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#8A5C43',
          colorInfo: '#8A5C43',
          colorSuccess: '#6B8E23',
          colorWarning: '#FAAD14',
          colorError: '#FF4D4F',
          borderRadius: 16,
          fontFamily: "'Nunito', 'Quicksand', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          colorBgBase: '#FDFBF7',
          colorTextBase: '#4A3E38',
        },
        components: {
          Card: {
            colorBgContainer: 'rgba(255, 255, 255, 0.85)',
            borderRadiusLG: 20,
          },
          Button: {
            borderRadius: 12,
          }
        }
      }}
    >
      <BrowserRouter basename="/admin-web">
        <AppRouter />
      </BrowserRouter>
    </ConfigProvider>
  );
}
