import webview

def create_app():
    # Create a native window that loads the web application URL
    webview.create_window(
        title='Renvora Dashboard',
        url='https://dashboard-3g1c.onrender.com/',
        width=1200,
        height=800,
        min_size=(800, 600)
    )
    
    # Start the application
    webview.start()

if __name__ == '__main__':
    create_app()
