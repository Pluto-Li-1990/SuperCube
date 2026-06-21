import SwiftUI

@main
struct SuperCubeApp: App {
    var body: some Scene {
        WindowGroup {
            WebGameView()
                .background(Color.black)
                .ignoresSafeArea()
        }
    }
}
