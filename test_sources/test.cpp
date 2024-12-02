#include <iostream>

class A {
private:
    int haha;

public:
    A(int value) : haha(value) {}

    void aaa() {
        std::cout << "Function a: haha = " << haha << std::endl;
    }

    void bbb() {
        std::cout << "do nothing " << std::endl;
    }
};

int main() {
    A obj(10);
    obj.aaa();
    obj.bbb();
    return 0;
}